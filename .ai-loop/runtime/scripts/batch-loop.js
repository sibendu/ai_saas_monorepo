"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const project_config_1 = require("./project-config");
function command(name) { return process.platform === "win32" && (name === "npm" || name === "npx" || name === "codex" || name === "claude") ? `${name}.cmd` : name; }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "feature"; }
function batchId() { return new Date().toISOString().replace(/[:.]/g, "-"); }
async function run(cwd, executable, args, input) {
    return new Promise((resolvePromise, rejectPromise) => {
        const throughCmd = process.platform === "win32" && /\.cmd$/i.test(executable);
        const child = (0, node_child_process_1.spawn)(throughCmd ? process.env.ComSpec ?? "cmd.exe" : executable, throughCmd ? ["/d", "/s", "/c", executable, ...args] : args, { cwd, shell: false, windowsHide: true, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] });
        let output = "";
        child.stdout?.on("data", (chunk) => { output += chunk.toString(); });
        child.stderr?.on("data", (chunk) => { output += chunk.toString(); });
        child.on("error", rejectPromise);
        if (input !== undefined)
            child.stdin?.end(input);
        child.on("close", (code) => resolvePromise({ code: code ?? 1, output }));
    });
}
async function git(root, args) {
    const result = await run(root, "git", args);
    if (result.code !== 0)
        throw new Error(`git ${args.join(" ")} failed: ${result.output.trim()}`);
    return result.output.trim();
}
function markdownFeature(text, source) {
    const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
    const values = new Map();
    if (match)
        for (const line of match[1].split(/\r?\n/)) {
            const item = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
            if (item)
                values.set(item[1], item[2].trim());
        }
    const request = (match ? match[2] : text).trim();
    const id = slug(values.get("id") || source?.split(/[\\/]/).pop()?.replace(/\.md$/i, "") || request.slice(0, 50));
    const access = values.get("databaseAccess");
    const databaseAccess = access === "none" || access === "read" || access === "write" ? access : "unknown";
    const dependsOn = (values.get("dependsOn") ?? "").replace(/[\[\]]/g, "").split(",").map((value) => value.trim()).filter(Boolean).map(slug);
    const predictedPaths = (values.get("predictedPaths") ?? "").replace(/[\[\]]/g, "").split(",").map((value) => value.trim()).filter(Boolean);
    return { id, request, source, dependsOn, databaseAccess, predictedPaths };
}
async function markdownFiles(directory) {
    const output = [];
    for (const entry of await (0, promises_1.readdir)(directory, { withFileTypes: true })) {
        const full = (0, node_path_1.join)(directory, entry.name);
        if (entry.isDirectory())
            output.push(...await markdownFiles(full));
        else if (/\.md$/i.test(entry.name))
            output.push(full);
    }
    return output;
}
function overlap(first, second) { return first.some((path) => second.some((other) => path === other || path.startsWith(`${other}/`) || other.startsWith(`${path}/`))); }
function featureUsesDatabase(feature, config) { return feature.databaseAccess !== "none" || config.concurrency?.verificationDatabaseAccess !== "none"; }
function schedule(features, config) {
    const maxWorkers = config.concurrency?.maxWorkers ?? 1;
    const complete = new Set();
    const waves = [];
    while (complete.size < features.length) {
        const candidates = features.filter((feature) => !complete.has(feature.id) && feature.dependsOn.every((dependency) => complete.has(dependency)));
        if (!candidates.length)
            throw new Error("Feature dependencies contain a cycle or unknown feature id.");
        const wave = [];
        for (const feature of candidates) {
            const parallelSafe = !featureUsesDatabase(feature, config) && feature.predictedPaths.length > 0 && !wave.some((item) => overlap(item.predictedPaths, feature.predictedPaths));
            if (wave.length === 0 || (parallelSafe && wave.length < maxWorkers && !wave.some((item) => featureUsesDatabase(item, config))))
                wave.push(feature);
            if (wave.length >= maxWorkers)
                break;
        }
        waves.push(wave.map((feature) => feature.id));
        wave.forEach((feature) => complete.add(feature.id));
    }
    return waves;
}
async function acquireLock(root, name) {
    const directory = (0, node_path_1.join)(root, ".ai-loop", "locks");
    await (0, promises_1.mkdir)(directory, { recursive: true });
    const path = (0, node_path_1.join)(directory, `${name}.lock`);
    try {
        const handle = await (0, promises_1.open)(path, "wx");
        await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
        return async () => { await handle.close(); await (0, promises_1.rm)(path, { force: true }); };
    }
    catch {
        throw new Error(`Resource lock ${name} is already held. The batch requires human review rather than overlapping work.`);
    }
}
async function runConfigured(root, worktree, commandSpec, log) {
    const executable = command(commandSpec.executable);
    const result = await run(worktree, executable, commandSpec.args);
    await (0, promises_1.writeFile)(log, result.output, "utf8");
    return result;
}
async function verifyIntegration(root, worktree, config, batchDirectory) {
    const commands = [...config.verification.commands, ...(config.database?.migrationStatus ? [config.database.migrationStatus] : []), ...(config.verification.finalBuild ? [config.verification.finalBuild] : [])];
    for (const commandSpec of commands) {
        const result = await runConfigured(root, worktree, commandSpec, (0, node_path_1.join)(batchDirectory, `integration-${commandSpec.id}.log`));
        if (result.code !== 0)
            throw new Error(`Integration verification failed at ${commandSpec.id}.`);
    }
}
function runtimeSchema(root) {
    const projectSchema = (0, node_path_1.join)(root, "scripts", "schemas", "agent-result.schema.json");
    return (0, node_fs_1.existsSync)(projectSchema) ? projectSchema : (0, node_path_1.join)(__dirname, "..", "schemas", "agent-result.schema.json");
}
function unsafeConflict(path) {
    return /(^|[\\/])(prisma[\\/]migrations|migrations|\.env|AGENTS\.md|CLAUDE\.md|\.ai-loop)([\\/]|$)|(^|[\\/])(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(path);
}
async function resolveConflict(root, worktree, feature, config, batchDirectory) {
    const conflicts = (await git(worktree, ["diff", "--name-only", "--diff-filter=U"])).split(/\r?\n/).filter(Boolean);
    if (!config.integration?.attemptConflictResolution || conflicts.some(unsafeConflict))
        return false;
    const prompt = `Resolve the current Git merge conflict for feature ${feature.id} in this integration worktree. Conflicted files: ${conflicts.join(", ")}. Preserve both completed feature behaviors, make the smallest safe resolution, and do not change secrets, migrations, lockfiles, AGENTS.md, CLAUDE.md, or .ai-loop files. Do not commit. Return a concise summary.`;
    const agent = await run(worktree, command("codex"), ["exec", "--sandbox", "workspace-write", "--cd", worktree], prompt);
    await (0, promises_1.writeFile)((0, node_path_1.join)(batchDirectory, `merge-resolution-${feature.id}.log`), agent.output, "utf8");
    if (agent.code !== 0)
        return false;
    const remaining = await git(worktree, ["diff", "--name-only", "--diff-filter=U"]);
    if (remaining)
        return false;
    const check = await run(worktree, "git", ["diff", "--check"]);
    if (check.code !== 0)
        return false;
    const add = await run(worktree, "git", ["add", "--all"]);
    if (add.code !== 0)
        return false;
    const commit = await run(worktree, "git", ["commit", "--no-edit"]);
    return commit.code === 0;
}
async function reviewIntegration(root, worktree, batchDirectory, batch) {
    const output = (0, node_path_1.join)(batchDirectory, "integration-review.json");
    const prompt = `You are the final integration reviewer. Do not modify files. Inspect the combined Git diff from ${batch.baseRevision}, the configured project checks, and the feature contracts/run evidence under ${batchDirectory}. Approve only if the combined implementation preserves all completed feature behavior and has sufficient code, test, and verification evidence. Return only JSON matching the supplied schema. Set needsHumanReview true for any unresolved conflict, security risk, database risk, or missing evidence.`;
    const result = batch.runtime === "claude-cli"
        ? await run(worktree, command("claude"), ["-p", "--output-format", "json", "--json-schema", await (0, promises_1.readFile)(runtimeSchema(root), "utf8"), "--permission-mode", "plan", "--allowedTools", "Read", "Glob", "Grep", "Bash"], prompt)
        : await run(worktree, command("codex"), ["exec", "--sandbox", "read-only", "--cd", worktree, "--output-schema", runtimeSchema(root), "--output-last-message", output], prompt);
    await (0, promises_1.writeFile)((0, node_path_1.join)(batchDirectory, "integration-review.log"), result.output, "utf8");
    if (result.code !== 0)
        throw new Error("Integration reviewer did not complete.");
    if (batch.runtime === "claude-cli") {
        const envelope = JSON.parse(result.output);
        if (envelope.structured_output === undefined)
            throw new Error("Claude integration reviewer did not return structured output.");
        await (0, promises_1.writeFile)(output, `${JSON.stringify(envelope.structured_output, null, 2)}\n`, "utf8");
    }
    if (!(0, node_fs_1.existsSync)(output))
        throw new Error("Integration reviewer did not produce structured output.");
    const review = JSON.parse(await (0, promises_1.readFile)(output, "utf8"));
    if (review.status !== "completed" || review.needsHumanReview)
        throw new Error(`Integration reviewer rejected the batch: ${review.summary ?? "missing approval"}`);
}
async function runFeature(root, batch, feature, config) {
    const featureDirectory = (0, node_path_1.join)(root, ".ai-loop", "batches", batch.id, "features", feature.id);
    await (0, promises_1.mkdir)(featureDirectory, { recursive: true });
    const worktree = (0, node_path_1.join)(root, ".ai-loop", "worktrees", batch.id, feature.id);
    const branch = `ai-loop/${batch.id.slice(0, 19)}-${feature.id}`;
    const worktreeResult = await run(root, "git", ["worktree", "add", "-b", branch, worktree, batch.baseRevision]);
    if (worktreeResult.code !== 0)
        throw new Error(`Could not create worktree for ${feature.id}: ${worktreeResult.output}`);
    await (0, promises_1.writeFile)((0, node_path_1.join)(featureDirectory, "feature.md"), feature.request, "utf8");
    const lockRelease = featureUsesDatabase(feature, config) ? await acquireLock(root, "db-global") : undefined;
    try {
        const bundledLoop = (0, node_path_1.join)(__dirname, "loop.js");
        const sourceLoop = (0, node_path_1.join)(root, "scripts", "loop.ts");
        const tsx = (0, node_path_1.join)(root, "node_modules", "tsx", "dist", "cli.mjs");
        const runnerArgs = (0, node_fs_1.existsSync)(bundledLoop)
            ? [bundledLoop]
            : (0, node_fs_1.existsSync)(tsx) ? [tsx, sourceLoop] : [];
        if (!runnerArgs.length)
            throw new Error("No bundled loop runtime or local tsx runner was found.");
        const result = await run(worktree, process.execPath, [...runnerArgs, "--feature-file", (0, node_path_1.join)(featureDirectory, "feature.md"), "--branch", branch, "--control-root", root, "--environment-root", root, "--runtime", batch.runtime]);
        await (0, promises_1.writeFile)((0, node_path_1.join)(featureDirectory, "runner.log"), result.output, "utf8");
        if (result.code !== 0)
            throw new Error(`Feature ${feature.id} did not complete successfully.`);
        return { feature, branch, worktree };
    }
    finally {
        if (lockRelease)
            await lockRelease();
    }
}
async function integrate(root, batch, completed, config, batchDirectory) {
    const integrationBranch = `ai-loop/integration/${batch.id.slice(0, 19)}`;
    const worktree = (0, node_path_1.join)(root, ".ai-loop", "worktrees", batch.id, "integration");
    const create = await run(root, "git", ["worktree", "add", "-b", integrationBranch, worktree, batch.baseRevision]);
    if (create.code !== 0)
        throw new Error(`Could not create integration worktree: ${create.output}`);
    for (const item of completed) {
        const merge = await run(worktree, "git", ["merge", "--no-ff", "--no-edit", item.branch]);
        if (merge.code !== 0) {
            const resolved = await resolveConflict(root, worktree, item.feature, config, batchDirectory);
            if (!resolved) {
                await run(worktree, "git", ["merge", "--abort"]);
                throw new Error(`Merge conflict while integrating ${item.feature.id}. The branch and worktree are preserved for human review.`);
            }
        }
    }
    const lockRelease = config.concurrency?.verificationDatabaseAccess !== "none" ? await acquireLock(root, "db-global") : undefined;
    try {
        await verifyIntegration(root, worktree, config, batchDirectory);
        await reviewIntegration(root, worktree, batchDirectory, batch);
    }
    finally {
        if (lockRelease)
            await lockRelease();
    }
    const targetHead = await git(root, ["rev-parse", batch.targetBranch]);
    if (targetHead !== batch.baseRevision)
        throw new Error(`Target branch ${batch.targetBranch} advanced after scheduling; integration branch is ready but requires human review.`);
    if (config.integration?.autoMerge !== true)
        return { integrationBranch, merged: false };
    const mergeBase = await run(root, "git", ["merge", "--ff-only", integrationBranch]);
    if (mergeBase.code !== 0)
        throw new Error(`Could not fast-forward ${batch.targetBranch}: ${mergeBase.output}`);
    return { integrationBranch, merged: true };
}
async function main() {
    const args = process.argv.slice(2);
    const root = (0, node_path_1.resolve)(process.cwd());
    const approveIndex = args.indexOf("--approve");
    const batchRoot = (0, node_path_1.join)(root, ".ai-loop", "batches");
    const runtimeIndex = args.indexOf("--runtime");
    const runtime = runtimeIndex === -1 ? "codex-cli" : args[runtimeIndex + 1];
    if (runtime !== "codex-cli" && runtime !== "claude-cli")
        throw new Error("--runtime must be codex-cli or claude-cli.");
    if (approveIndex !== -1) {
        const id = args[approveIndex + 1];
        if (!id)
            throw new Error("--approve requires a batch id.");
        const batchDirectory = (0, node_path_1.join)(batchRoot, id);
        const batch = JSON.parse(await (0, promises_1.readFile)((0, node_path_1.join)(batchDirectory, "batch-plan.json"), "utf8"));
        if (batch.status !== "awaiting_approval")
            throw new Error(`Batch ${id} is not awaiting approval.`);
        const { config } = await (0, project_config_1.loadProjectConfig)(root);
        batch.baseRevision = await git(root, ["rev-parse", batch.targetBranch]);
        if (await git(root, ["status", "--porcelain"]))
            throw new Error("Target repository must be clean before a batch starts.");
        batch.status = "running";
        await (0, promises_1.writeFile)((0, node_path_1.join)(batchDirectory, "batch-plan.json"), `${JSON.stringify(batch, null, 2)}\n`, "utf8");
        const schedulerRelease = await acquireLock(root, `integration-${slug(batch.targetBranch)}`);
        try {
            const completed = [];
            for (const wave of batch.waves) {
                const results = await Promise.all(wave.map((id) => runFeature(root, batch, batch.features.find((feature) => feature.id === id), config)));
                completed.push(...results);
            }
            const integration = await integrate(root, batch, completed, config, batchDirectory);
            batch.status = "completed";
            await (0, promises_1.writeFile)((0, node_path_1.join)(batchDirectory, "result.json"), `${JSON.stringify({ status: "completed", integration, completedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
        }
        catch (error) {
            batch.status = "needs_human_review";
            await (0, promises_1.writeFile)((0, node_path_1.join)(batchDirectory, "result.json"), `${JSON.stringify({ status: "needs_human_review", detail: error instanceof Error ? error.message : "Batch failure" }, null, 2)}\n`, "utf8");
            throw error;
        }
        finally {
            await schedulerRelease();
            await (0, promises_1.writeFile)((0, node_path_1.join)(batchDirectory, "batch-plan.json"), `${JSON.stringify(batch, null, 2)}\n`, "utf8");
        }
        return;
    }
    const requests = [];
    for (let index = 0; index < args.length; index += 1) {
        if (args[index] === "--feature" && args[index + 1])
            requests.push({ text: args[++index] });
        if (args[index] === "--feature-file" && args[index + 1]) {
            const path = (0, node_path_1.resolve)(args[++index]);
            requests.push({ text: await (0, promises_1.readFile)(path, "utf8"), source: path });
        }
        if (args[index] === "--feature-dir" && args[index + 1])
            for (const path of await markdownFiles((0, node_path_1.resolve)(args[++index])))
                requests.push({ text: await (0, promises_1.readFile)(path, "utf8"), source: path });
    }
    if (!requests.length)
        throw new Error('Usage: npm run batch-loop -- --feature "..." | --feature-file feature.md | --feature-dir features');
    const { config } = await (0, project_config_1.loadProjectConfig)(root);
    const features = requests.map(({ text, source }) => markdownFeature(text, source));
    const ids = new Set();
    for (const feature of features) {
        if (!feature.request)
            throw new Error(`Feature ${feature.id} is empty.`);
        if (ids.has(feature.id))
            throw new Error(`Duplicate feature id: ${feature.id}`);
        ids.add(feature.id);
    }
    const id = batchId();
    const targetBranch = config.integration?.targetBranch ?? await git(root, ["branch", "--show-current"]);
    const baseRevision = await git(root, ["rev-parse", targetBranch]);
    const batch = { version: 1, id, status: "awaiting_approval", root, targetBranch, baseRevision, maxWorkers: config.concurrency?.maxWorkers ?? 1, runtime, features, waves: schedule(features, config), createdAt: new Date().toISOString() };
    const batchDirectory = (0, node_path_1.join)(batchRoot, id);
    await (0, promises_1.mkdir)(batchDirectory, { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(batchDirectory, "batch-plan.json"), `${JSON.stringify(batch, null, 2)}\n`, "utf8");
    process.stdout.write(`Batch plan ready for approval: ${id}\n${JSON.stringify({ targetBranch, runtime, waves: batch.waves, features: features.map((feature) => ({ id: feature.id, databaseAccess: feature.databaseAccess, predictedPaths: feature.predictedPaths })) }, null, 2)}\n`);
}
void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "Batch runner failed"}\n`); process.exitCode = 1; });
