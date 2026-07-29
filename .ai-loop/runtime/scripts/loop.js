"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const project_config_1 = require("./project-config");
class HumanReviewRequired extends Error {
    category;
    constructor(message, category = "ambiguous_requirement") {
        super(message);
        this.category = category;
    }
}
const maxStepAttempts = 2;
const maxReviewAttempts = 2;
async function parseOptions(args) {
    let planFile;
    let runtime = "codex-cli";
    const validateProject = args.includes("--validate-project");
    const branchValue = args.find((arg) => arg.startsWith("--branch="));
    const branchIndex = args.indexOf("--branch");
    const branch = branchValue ? branchValue.slice("--branch=".length).trim() : branchIndex === -1 ? undefined : args[branchIndex + 1]?.trim();
    const controlRootValue = args.find((arg) => arg.startsWith("--control-root="));
    const controlRootIndex = args.indexOf("--control-root");
    const controlRoot = controlRootValue ? controlRootValue.slice("--control-root=".length).trim() : controlRootIndex === -1 ? undefined : args[controlRootIndex + 1]?.trim();
    const environmentRootValue = args.find((arg) => arg.startsWith("--environment-root="));
    const environmentRootIndex = args.indexOf("--environment-root");
    const environmentRoot = environmentRootValue ? environmentRootValue.slice("--environment-root=".length).trim() : environmentRootIndex === -1 ? undefined : args[environmentRootIndex + 1]?.trim();
    const runtimeEquals = args.find((arg) => arg.startsWith("--runtime="));
    const runtimeIndex = args.indexOf("--runtime");
    const runtimeValue = runtimeEquals
        ? runtimeEquals.slice("--runtime=".length).trim()
        : runtimeIndex === -1
            ? undefined
            : args[runtimeIndex + 1]?.trim();
    if (runtimeValue) {
        if (runtimeValue !== "codex-cli" && runtimeValue !== "claude-cli") {
            throw new Error("--runtime must be codex-cli or claude-cli.");
        }
        runtime = runtimeValue;
    }
    const planFileEquals = args.find((arg) => arg.startsWith("--plan-file="));
    if (planFileEquals) {
        planFile = planFileEquals.slice("--plan-file=".length).trim();
    }
    else {
        const planFileIndex = args.indexOf("--plan-file");
        if (planFileIndex !== -1) {
            planFile = args[planFileIndex + 1]?.trim();
        }
    }
    const featureFileEquals = args.find((arg) => arg.startsWith("--feature-file="));
    if (featureFileEquals) {
        const featureFile = featureFileEquals.slice("--feature-file=".length).trim();
        if (!featureFile) {
            throw new Error("--feature-file requires a path.");
        }
        return {
            feature: (await (0, promises_1.readFile)((0, node_path_1.resolve)(featureFile), "utf8")).trim(),
            planFile,
            runtime,
            validateProject,
            branch,
            controlRoot,
            environmentRoot,
        };
    }
    const featureFileIndex = args.indexOf("--feature-file");
    if (featureFileIndex !== -1) {
        const featureFile = args[featureFileIndex + 1]?.trim();
        if (!featureFile) {
            throw new Error("--feature-file requires a path.");
        }
        return {
            feature: (await (0, promises_1.readFile)((0, node_path_1.resolve)(featureFile), "utf8")).trim(),
            planFile,
            runtime,
            validateProject,
            branch,
            controlRoot,
            environmentRoot,
        };
    }
    const inlineFeature = args.find((arg) => arg.startsWith("--feature="));
    if (inlineFeature) {
        const feature = inlineFeature.slice("--feature=".length).trim();
        if (feature) {
            return { feature, planFile, runtime, validateProject, branch, controlRoot, environmentRoot };
        }
    }
    const featureIndex = args.indexOf("--feature");
    if (featureIndex === -1 || !args[featureIndex + 1]?.trim()) {
        if (validateProject) {
            return { planFile, runtime, validateProject, branch, controlRoot, environmentRoot };
        }
        throw new Error('Usage: npm run loop -- --feature "Describe the feature to build" [--plan-file .ai-loop/runs/.../plan.json] [--runtime codex-cli|claude-cli] [--branch branch] [--control-root path] [--environment-root path] | npm run loop -- --validate-project');
    }
    const stopAt = args.findIndex((arg, index) => index > featureIndex && (arg.startsWith("--plan-file") || arg.startsWith("--runtime")));
    const featureArgs = stopAt === -1 ? args.slice(featureIndex + 1) : args.slice(featureIndex + 1, stopAt);
    return { feature: featureArgs.join(" ").trim(), planFile, runtime, validateProject, branch, controlRoot, environmentRoot };
}
function command(name) {
    return process.platform === "win32" ? `${name}.cmd` : name;
}
function schemaPath(root, file) {
    const projectSchema = (0, node_path_1.join)(root, "scripts", "schemas", file);
    return (0, node_fs_1.existsSync)(projectSchema) ? projectSchema : (0, node_path_1.join)(__dirname, "..", "schemas", file);
}
function runId() {
    return new Date().toISOString().replace(/[:.]/g, "-");
}
function slug(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 48) || "feature";
}
const sensitiveEnvironmentKeys = new Set([
    "DATABASE_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
    "GITHUB_ID",
    "GITHUB_SECRET",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
]);
function registerSensitiveEnvironmentKeys(keys) {
    for (const key of keys) {
        if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
            sensitiveEnvironmentKeys.add(key);
        }
    }
}
function redactSecrets(text) {
    let redacted = text;
    for (const key of sensitiveEnvironmentKeys) {
        redacted = redacted.replace(new RegExp(`(${key}\\s*=\\s*)(?:"[^"\\r\\n]*"|'[^'\\r\\n]*'|[^\\s,;"'}\\\\r\\\\n]+)`, "gi"), "$1[REDACTED]");
        redacted = redacted.replace(new RegExp(`("${key}"\\s*:\\s*)"[^"]*"`, "gi"), '$1"[REDACTED]"');
    }
    redacted = redacted.replace(/postgres(?:ql)?:\/\/[^\s"'`<>\\]+/gi, "postgresql://[REDACTED]");
    redacted = redacted.replace(/GOCSPX-[A-Za-z0-9_-]+/g, "[REDACTED_GOOGLE_SECRET]");
    redacted = redacted.replace(/1\/\/[A-Za-z0-9_-]+/g, "[REDACTED_GOOGLE_REFRESH_TOKEN]");
    return redacted;
}
function safeJsonLine(value) {
    return redactSecrets(JSON.stringify(value));
}
async function appendEvent(context, type, data = {}) {
    await (0, promises_1.appendFile)(context.eventsFile, `${safeJsonLine({ timestamp: new Date().toISOString(), type, ...data })}\n`, "utf8");
}
function isForbiddenShellPattern(executable, args) {
    const commandText = `${executable} ${args.join(" ")}`.toLowerCase();
    if (!/(powershell|pwsh|cmd|bash|sh|cat|type|get-content|gc)/.test(commandText)) {
        return false;
    }
    return [
        ".env",
        "get-content env:",
        "printenv",
        "set |",
        "dir env:",
        "ls env:",
    ].some((pattern) => commandText.includes(pattern));
}
async function runProcess(context, label, executable, args, cwd = context.root, environment = process.env, input) {
    const outputFile = (0, node_path_1.join)(context.runDirectory, `${label}.log`);
    if (isForbiddenShellPattern(executable, args)) {
        throw new HumanReviewRequired(`Blocked unsafe command pattern for ${label}. Use the orchestrator's safe env/capability helpers instead.`, "security_risk");
    }
    await appendEvent(context, "command_started", { label, executable, args, cwd });
    const result = await new Promise((resolvePromise, rejectPromise) => {
        const runsThroughCmd = process.platform === "win32" && /\.(cmd|bat)$/i.test(executable);
        const stdio = [input === undefined ? "ignore" : "pipe", "pipe", "pipe"];
        const child = runsThroughCmd
            ? (0, node_child_process_1.spawn)(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", executable, ...args], {
                cwd,
                env: environment,
                shell: false,
                stdio,
                windowsHide: true,
            })
            : (0, node_child_process_1.spawn)(executable, args, {
                cwd,
                env: environment,
                shell: false,
                stdio,
                windowsHide: true,
            });
        let output = "";
        if (input !== undefined) {
            child.stdin?.end(input);
        }
        const capture = (chunk) => {
            const text = redactSecrets(chunk.toString());
            output += text;
            for (const line of text.split(/\r?\n/)) {
                if (line.trim()) {
                    void appendEvent(context, "command_output", { label, line });
                }
            }
        };
        child.stdout?.on("data", capture);
        child.stderr?.on("data", capture);
        child.on("error", rejectPromise);
        child.on("close", async (code) => {
            await (0, promises_1.writeFile)(outputFile, redactSecrets(output), "utf8");
            resolvePromise({ command: `${executable} ${args.join(" ")}`, exitCode: code ?? 1, outputFile });
        });
    });
    await appendEvent(context, "command_finished", { label, ...result });
    return result;
}
async function git(context, label, args) {
    return runProcess(context, label, "git", args);
}
async function gitOutput(context, label, args) {
    const result = await git(context, label, args);
    if (result.exitCode !== 0) {
        throw new Error(`Git command failed: ${result.command}. See ${result.outputFile}`);
    }
    return (await (0, promises_1.readFile)(result.outputFile, "utf8")).trim();
}
async function assertPreflight(context) {
    const status = await gitOutput(context, "preflight-status", ["status", "--porcelain"]);
    if (status) {
        throw new HumanReviewRequired("The repository is not clean. Commit, stash, or discard existing changes before starting a managed feature run.", "ambiguous_requirement");
    }
    context.environmentReport = await verifyEnvironment(context);
    await (0, promises_1.writeFile)((0, node_path_1.join)(context.runDirectory, "environment.json"), `${JSON.stringify(context.environmentReport, null, 2)}\n`, "utf8");
    await appendEvent(context, "environment_verified", { environment: context.environmentReport });
    await waitForDevServer(context);
}
function configuredHealthUrl(context) {
    return process.env.AI_LOOP_HEALTH_URL ?? context.project.application?.healthUrl;
}
function environmentFilePath(context) {
    const configured = context.project.environment?.file;
    return configured ? (0, node_path_1.resolve)(context.environmentRoot, configured) : undefined;
}
function parseEnvironmentFile(contents) {
    const values = {};
    for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match)
            continue;
        const raw = match[2].trim();
        values[match[1]] = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")) ? raw.slice(1, -1) : raw;
    }
    return values;
}
function commandExecutable(executable) {
    return executable === "npm" || executable === "npx" ? command(executable) : executable;
}
async function runConfiguredCommand(context, label, configured, environment = context.verificationEnvironment) {
    return runProcess(context, label, commandExecutable(configured.executable), configured.args, context.root, environment);
}
async function verifyEnvironment(context) {
    const envPath = environmentFilePath(context);
    let envFile = "";
    if (envPath) {
        if (!(0, node_fs_1.existsSync)(envPath)) {
            throw new HumanReviewRequired(`Missing configured environment file: ${context.project.environment?.file}.`, "external_dependency");
        }
        envFile = await (0, promises_1.readFile)(envPath, "utf8");
        context.verificationEnvironment = { ...context.verificationEnvironment, ...parseEnvironmentFile(envFile) };
    }
    const requiredVariables = context.project.environment?.requiredVariables ?? [];
    const envPresence = Object.fromEntries(requiredVariables.map((key) => [key, new RegExp(`^${key}=`, "m").test(envFile)]));
    const missingVariables = Object.entries(envPresence).filter(([, present]) => !present).map(([key]) => key);
    if (missingVariables.length > 0) {
        throw new HumanReviewRequired(`Missing configured environment variables: ${missingVariables.join(", ")}.`, "external_dependency");
    }
    let database;
    const databaseConfig = context.project.database;
    if (databaseConfig) {
        const urlVariable = databaseConfig.urlVariable;
        const databaseUrl = urlVariable ? envFile.match(new RegExp(`^${urlVariable}=["']?([^"'\\r\\n]+)["']?`, "m"))?.[1] : undefined;
        if (databaseConfig.localOnly && !databaseUrl) {
            throw new HumanReviewRequired(`${urlVariable ?? "Configured database URL"} is required for a local-only database policy.`, "external_dependency");
        }
        let host;
        let localOnly = !databaseConfig.localOnly;
        if (databaseUrl) {
            try {
                host = new URL(databaseUrl).hostname;
                localOnly = new Set(["localhost", "127.0.0.1", "::1"]).has(host);
            }
            catch {
                throw new HumanReviewRequired(`${urlVariable ?? "Database URL"} is not a valid URL.`, "external_dependency");
            }
            if (databaseConfig.localOnly && !localOnly) {
                throw new HumanReviewRequired("The configured database policy only permits local database URLs.", "security_risk");
            }
        }
        database = { configured: Boolean(databaseUrl) || !urlVariable, localOnly, host };
    }
    const commands = { node: false, git: false };
    for (const check of [
        { id: "node", executable: "node", args: ["--version"] },
        { id: "git", executable: "git", args: ["--version"] },
        ...(context.project.preflight?.commands ?? []),
    ]) {
        const result = await runConfiguredCommand(context, `env-${check.id}`, check);
        commands[check.id] = result.exitCode === 0;
    }
    const missingCommands = Object.entries(commands)
        .filter(([, available]) => !available)
        .map(([label]) => label);
    if (missingCommands.length > 0) {
        throw new HumanReviewRequired(`Missing required local commands: ${missingCommands.join(", ")}.`, "tooling_failure");
    }
    if (databaseConfig?.migrationStatus) {
        const databaseStatus = await runConfiguredCommand(context, "env-database-status", databaseConfig.migrationStatus);
        if (databaseStatus.exitCode !== 0) {
            throw new HumanReviewRequired(`Configured database preflight failed. See ${databaseStatus.outputFile}.`, "external_dependency");
        }
    }
    let browser;
    if (context.project.browser?.required) {
        const localBrowserPath = findLocalChromium();
        const ffmpegLikelyAvailable = findPlaywrightAsset("ffmpeg") !== undefined;
        const managedBrowserLikelyAvailable = findPlaywrightAsset("chromium") !== undefined || findPlaywrightAsset("chrome-headless-shell") !== undefined;
        const videoDisabled = context.project.browser.disableVideoWithoutFfmpeg === true && !ffmpegLikelyAvailable;
        if (!managedBrowserLikelyAvailable && !localBrowserPath) {
            throw new HumanReviewRequired("No configured browser runtime was found for browser-based tests.", "tooling_failure");
        }
        const executableVariable = context.project.browser.executablePathEnvironmentVariable;
        context.verificationEnvironment = {
            ...context.verificationEnvironment,
            ...(localBrowserPath && executableVariable ? { [executableVariable]: localBrowserPath } : {}),
            ...(videoDisabled ? { PLAYWRIGHT_DISABLE_VIDEO: "1" } : {}),
        };
        browser = { managedBrowserLikelyAvailable, localBrowserPath, ffmpegLikelyAvailable, videoDisabled };
    }
    return {
        project: context.project.project,
        healthUrl: configuredHealthUrl(context),
        envPresence,
        database,
        commands,
        browser,
    };
}
function findLocalChromium() {
    const candidates = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        (0, node_path_1.join)(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    return candidates.find((candidate) => candidate && (0, node_fs_1.existsSync)(candidate));
}
function findPlaywrightAsset(assetName) {
    const root = (0, node_path_1.join)(process.env.LOCALAPPDATA ?? "", "ms-playwright");
    if (!root || !(0, node_fs_1.existsSync)(root)) {
        return undefined;
    }
    const stack = [root];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) {
            continue;
        }
        try {
            for (const entry of (0, node_fs_1.readdirSync)(current, { withFileTypes: true })) {
                const next = (0, node_path_1.join)(current, entry.name);
                if (entry.name.toLowerCase().includes(assetName.toLowerCase())) {
                    return next;
                }
                if (entry.isDirectory()) {
                    stack.push(next);
                }
            }
        }
        catch {
            // Best-effort capability detection only.
        }
    }
    return undefined;
}
async function waitForDevServer(context) {
    const healthUrl = configuredHealthUrl(context);
    if (!healthUrl)
        return;
    const deadline = Date.now() + (context.project.application?.waitForHealthMs ?? 30_000);
    while (Date.now() < deadline) {
        try {
            const response = await fetch(healthUrl);
            if (response.ok) {
                await appendEvent(context, "development_server_ready", { healthUrl });
                return;
            }
        }
        catch {
            // The developer may still be starting the server.
        }
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
    }
    throw new HumanReviewRequired(`The configured application was not healthy at ${healthUrl}.`, "tooling_failure");
}
function planPrompt(context) {
    const feature = context.feature;
    return `You are the planner in a local feature-delivery loop. Read AGENTS.md and the application files needed to plan this app feature without modifying files.

Requested app feature:
${feature}

Return only final JSON matching the supplied schema.

The requested app feature above is the concrete feature request. It is present and complete enough to plan. Do not say the feature request is missing. Do not add a clarify-feature step. Escalate only when the feature requires a real product decision or unavailable external access.

The plan must be an implementation plan for the requested application feature itself. Do not return a plan for inspecting the repository, clarifying the feature, starting the loop, planning the feature, implementing generic steps, verifying generically, hardening the orchestrator, or committing. The orchestrator has already handled run setup.

Project configuration (the authoritative technology contract):
${JSON.stringify(context.project, null, 2)}

Treat scripts/loop.ts, scripts/project-config.ts, docs/, schemas, and .ai-loop run artifacts as policy/runtime context only, not as feature targets. Focus on the application code, data definitions, and tests appropriate for the configured architecture.

Create a small, dependency-aware feature plan with concrete success criteria that mention the feature's domain objects and user-visible behavior. Every acceptance criterion must be objectively verifiable. Mark mayChangeDatabase true for any schema, migration, SQL, seed-data, or runtime database change.

Also create:
- acceptanceContract: one entry per objectively testable criterion, with required evidence.
- testContract: explicit tests/evidence planned before implementation; do not accept "page exists" as proof of a full flow.
- truthTable: user/system scenarios covering success, failure, missing-data, and edge cases.

If the feature touches the database, make that explicit in mayChangeDatabase. The orchestrator holds a global DB lock for DB-touching feature runs; do not plan parallel DB work. Do not include commits, pushes, deployments, destructive resets, production actions, or secret changes.`;
}
function implementationPrompt(context, step, previousFailure) {
    const changeExpectation = requiresRepositoryChange(step)
        ? "This assigned step is expected to change repository files. Do not return completed after only reading files or restating the plan."
        : "This assigned step may be read-only if the listed success criteria are fully evidenced.";
    return `You are the implementer in a local feature-delivery loop. Your job is to IMPLEMENT the assigned step, not merely summarize it.

First read AGENTS.md, CLAUDE.md, docs/orchestrator-design.md, and the feature plan at ${(0, node_path_1.join)(context.runDirectory, "plan.json")}. Then complete the assigned step below.

${changeExpectation}

Original feature request:
${context.feature}

Assigned step (${step.id}): ${step.title}
Instructions: ${step.instructions}
Success criteria:
${step.successCriteria.map((criterion) => `- ${criterion}`).join("\n")}

Acceptance contract:
${contextPlanContractText(context)}

Work directly in the current repository. Make the smallest complete change, add focused tests, and preserve existing behavior. Do not commit, push, deploy, change secrets, or use destructive database operations. Follow the configured database and verification commands; never invent a technology-specific command. ${configuredHealthUrl(context) ? `The configured application health endpoint is ${configuredHealthUrl(context)}.` : "This project has no configured application health endpoint."}
Use safe, explicit commands for the host platform and never dump .env or environment variables. Use presence checks only.
${previousFailure ? `\nThe previous verification failed. Fix these concrete failures before reporting completion:\n${previousFailure}` : ""}

Return only JSON matching the supplied schema. Set status to completed only after the assigned step's success criteria are actually satisfied. Set needsHumanReview to true if requirements are ambiguous, risky, or cannot be verified.`;
}
function reviewPrompt(context, plan, verification) {
    return `You are the independent reviewer in a local feature-delivery loop. Read AGENTS.md, docs/orchestrator-design.md, the original feature request, plan, current diff, and verification logs. Do not modify files.

Feature request:
${context.feature}

Acceptance criteria:
${plan.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n")}

Acceptance contract:
${plan.acceptanceContract
        .map((contract) => `- ${contract.id}: ${contract.criterion}; required evidence: ${contract.requiredEvidence.join("; ")}`)
        .join("\n")}

Test contract:
${plan.testContract
        .map((test) => `- ${test.criterionId}: ${test.testName} (${test.testType}) proves ${test.proves.join("; ")}`)
        .join("\n")}

Truth table:
${plan.truthTable
        .map((row) => `- ${row.scenario}: given ${row.given}; when ${row.when}; then ${row.then}`)
        .join("\n")}

Verification evidence files:
${verification.map((result) => `- ${result.outputFile} (exit ${result.exitCode})`).join("\n")}

Approve only if every acceptanceContract item has code evidence, test evidence, and verification evidence. Return an evidenceMatrix. If rejecting, set status needs_changes unless the issue truly requires a human decision. Use humanReviewCategory:
- reviewer_rejected_evidence for missing/fixable evidence or test gaps.
- ambiguous_requirement for unclear product intent.
- security_risk for secret leakage or unsafe auth/security behavior.
- destructive_db_change for risky DB operations.
- external_dependency for unavailable third-party/manual setup.
- tooling_failure for local tool failures.
Require human review only for ambiguity, unfixable external dependency, unsafe migrations, security concerns, or exhausted recovery. Return only JSON matching the supplied schema.`;
}
function recoveryPrompt(context, plan, review) {
    return `You are the recovery implementer in a local feature-delivery loop. The reviewer rejected the feature, but the issue appears fixable without human clarification.

Original feature request:
${context.feature}

Acceptance contract:
${plan.acceptanceContract
        .map((contract) => `- ${contract.id}: ${contract.criterion}; required evidence: ${contract.requiredEvidence.join("; ")}`)
        .join("\n")}

Reviewer summary:
${review.summary}

Missing evidence:
${(review.missingEvidence ?? []).map((item) => `- ${item.criterion}: ${item.gap}`).join("\n") || "- none provided"}

Recovery hints:
${(review.recoveryHints ?? []).map((hint) => `- ${hint}`).join("\n") || "- infer the smallest safe fix from the reviewer summary"}

Read AGENTS.md and relevant code. Make the smallest safe code/test change that closes the review gap. Do not change secrets, dump .env, commit, push, deploy, run destructive DB commands, or broaden scope. Return only JSON matching the supplied schema.`;
}
function contextPlanContractText(context) {
    const planPath = (0, node_path_1.join)(context.runDirectory, "plan.json");
    return `Read ${planPath}; implement only evidence needed for the assigned step and keep the global acceptance/test contract satisfied.`;
}
async function invokeAgent(context, role, sandbox, prompt, schema) {
    const outputFile = (0, node_path_1.join)(context.runDirectory, `${role}.json`);
    const result = await runAgentAdapter(context, role, sandbox, prompt, schema, outputFile);
    if (result.exitCode !== 0 || !(0, node_fs_1.existsSync)(outputFile)) {
        throw new HumanReviewRequired(`The ${role} agent did not complete. See ${result.outputFile}.`);
    }
    const head = await gitOutput(context, `${role}-head`, ["rev-parse", "HEAD"]);
    if (head !== context.baseRevision) {
        throw new HumanReviewRequired(`${role} created a commit. Managed agents must not commit independently.`);
    }
    try {
        return JSON.parse(await (0, promises_1.readFile)(outputFile, "utf8"));
    }
    catch {
        throw new HumanReviewRequired(`${role} returned invalid structured output. See ${outputFile}.`);
    }
}
async function runAgentAdapter(context, role, sandbox, prompt, schema, outputFile) {
    if (context.runtime === "claude-cli") {
        const schemaText = await (0, promises_1.readFile)(schema, "utf8");
        const permissionMode = sandbox === "workspace-write" ? "acceptEdits" : "plan";
        const result = await runProcess(context, role, command("claude"), [
            "-p",
            "--output-format", "json",
            "--json-schema", schemaText,
            "--permission-mode", permissionMode,
            "--allowedTools", "Read", "Glob", "Grep", "Bash", "Edit", "Write",
        ], context.root, context.verificationEnvironment, prompt);
        if (result.exitCode === 0) {
            try {
                const envelope = JSON.parse(await (0, promises_1.readFile)(result.outputFile, "utf8"));
                if (envelope.structured_output === undefined)
                    throw new Error("Claude response did not include structured_output.");
                await (0, promises_1.writeFile)(outputFile, `${JSON.stringify(envelope.structured_output, null, 2)}\n`, "utf8");
            }
            catch (error) {
                throw new HumanReviewRequired(`Could not parse Claude structured output for ${role}: ${error instanceof Error ? error.message : "unknown error"}`, "tooling_failure");
            }
        }
        return result;
    }
    return runProcess(context, role, command("codex"), [
        "exec",
        "--json",
        "--sandbox",
        sandbox,
        "--cd",
        context.root,
        "--output-schema",
        schema,
        "--output-last-message",
        outputFile,
    ], context.root, context.verificationEnvironment, prompt);
}
const commonFeatureWords = new Set([
    "about",
    "account",
    "after",
    "allow",
    "alongwith",
    "backend",
    "build",
    "completion",
    "either",
    "existence",
    "feature",
    "following",
    "found",
    "login",
    "record",
    "register",
    "should",
    "successful",
    "their",
    "there",
    "user",
    "using",
    "would",
]);
const metaPlanStepIds = new Set([
    "clarify-feature",
    "prepare-run",
    "plan-feature",
    "implement-steps",
    "verify-and-review",
    "commit-result",
]);
function featureKeywords(feature) {
    return Array.from(new Set(feature.toLowerCase().match(/[a-z0-9]{5,}/g) ?? []))
        .filter((word) => !commonFeatureWords.has(word))
        .slice(0, 12);
}
function normalizePlan(plan) {
    const normalized = plan;
    if (!normalized.acceptanceContract?.length) {
        normalized.acceptanceContract = normalized.acceptanceCriteria.map((criterion, index) => ({
            id: `criterion-${index + 1}`,
            criterion,
            requiredEvidence: [criterion],
            acceptableTestTypes: ["e2e"],
        }));
    }
    if (!normalized.testContract?.length) {
        normalized.testContract = normalized.acceptanceContract.map((contract) => ({
            criterionId: contract.id,
            testName: `Evidence for ${contract.id}`,
            testType: contract.acceptableTestTypes[0] ?? "e2e",
            proves: contract.requiredEvidence,
        }));
    }
    if (!normalized.truthTable?.length) {
        normalized.truthTable = normalized.acceptanceCriteria.map((criterion) => ({
            scenario: criterion,
            given: "The feature preconditions are met",
            when: "The user exercises the feature",
            then: criterion,
        }));
    }
    return normalized;
}
function validatePlan(plan, feature) {
    if (plan.acceptanceContract.length < plan.acceptanceCriteria.length) {
        throw new HumanReviewRequired("The plan did not create enough acceptance contract entries for the acceptance criteria.", "reviewer_rejected_evidence");
    }
    const contractIds = new Set(plan.acceptanceContract.map((contract) => contract.id));
    const testsWithoutContract = plan.testContract.filter((test) => !contractIds.has(test.criterionId));
    if (testsWithoutContract.length > 0) {
        throw new HumanReviewRequired(`The test contract references unknown criteria: ${testsWithoutContract
            .map((test) => test.criterionId)
            .join(", ")}.`, "reviewer_rejected_evidence");
    }
    const ids = new Set(plan.steps.map((step) => step.id));
    for (const step of plan.steps) {
        if (metaPlanStepIds.has(step.id)) {
            throw new HumanReviewRequired(`The planner returned a loop meta-plan instead of a feature implementation plan at step ${step.id}.`, "ambiguous_requirement");
        }
        if (step.dependsOn.includes(step.id) || step.dependsOn.some((dependency) => !ids.has(dependency))) {
            throw new HumanReviewRequired(`The plan has invalid dependencies for step ${step.id}.`, "ambiguous_requirement");
        }
    }
    const planText = JSON.stringify(plan).toLowerCase();
    const keywords = featureKeywords(feature);
    const matches = keywords.filter((keyword) => planText.includes(keyword));
    if (keywords.length >= 3 && matches.length < 3) {
        throw new HumanReviewRequired(`The planner returned a plan that is not specific to the feature. Matched keywords: ${matches.join(", ") || "none"}.`, "ambiguous_requirement");
    }
}
function planTouchesDatabase(plan) {
    const planText = JSON.stringify(plan).toLowerCase();
    return (plan.steps.some((step) => step.mayChangeDatabase) ||
        /\b(database|postgres|postgresql|prisma|migration|schema|table|model|seed|backfill|sql)\b/.test(planText));
}
async function verify(context, label) {
    const checks = [...context.project.verification.commands];
    if (context.project.database?.migrationStatus) {
        checks.push(context.project.database.migrationStatus);
    }
    const results = [];
    for (const check of checks) {
        const isBrowserCheck = context.project.browser?.testFramework !== undefined && check.id.toLowerCase().includes(context.project.browser.testFramework.toLowerCase());
        const environment = isBrowserCheck
            ? { ...context.verificationEnvironment, AI_LOOP_ARTIFACT_DIR: (0, node_path_1.join)(context.runDirectory, "evidence", "browser") }
            : context.verificationEnvironment;
        const result = await runConfiguredCommand(context, `${label}-${check.id}`, check, environment);
        results.push(result);
        if (result.exitCode !== 0) {
            break;
        }
    }
    return results;
}
function failedChecks(results) {
    return results.filter((result) => result.exitCode !== 0);
}
function requiresRepositoryChange(step) {
    return !/^read-/.test(step.id) && !/^verify-/.test(step.id);
}
async function runStep(context, step, schema) {
    for (let attempt = 1; attempt <= maxStepAttempts; attempt += 1) {
        const failure = attempt === 1 ? undefined : "Read the previous verification logs in the run directory and repair the failures.";
        const beforeStatus = await gitOutput(context, `${step.id}-${attempt}-before-status`, ["status", "--porcelain"]);
        const implementation = (await invokeAgent(context, `implement-${step.id}-${attempt}`, "workspace-write", implementationPrompt(context, step, failure), schema));
        if (implementation.needsHumanReview || implementation.status === "blocked") {
            throw new HumanReviewRequired(`Implementer requested human review for step ${step.id}: ${implementation.summary}`);
        }
        const afterStatus = await gitOutput(context, `${step.id}-${attempt}-after-status`, ["status", "--porcelain"]);
        if (requiresRepositoryChange(step) && afterStatus === beforeStatus) {
            throw new HumanReviewRequired(`Step ${step.id} reported completion without creating any repository changes. Review ${(0, node_path_1.join)(context.runDirectory, `implement-${step.id}-${attempt}.log`)}.`);
        }
        const verification = await verify(context, `${step.id}-${attempt}`);
        if (failedChecks(verification).length === 0) {
            await appendEvent(context, "step_verified", { step: step.id, attempt, verification });
            return verification;
        }
        await appendEvent(context, "step_verification_failed", { step: step.id, attempt, verification });
    }
    throw new HumanReviewRequired(`Step ${step.id} exhausted ${maxStepAttempts} attempts. Review its evidence logs.`);
}
async function commit(context) {
    const changed = await gitOutput(context, "commit-status", ["status", "--porcelain"]);
    if (!changed) {
        throw new HumanReviewRequired("The run passed checks but produced no changes to commit.");
    }
    const add = await git(context, "commit-add", ["add", "--all"]);
    if (add.exitCode !== 0) {
        throw new HumanReviewRequired(`Could not stage the verified changes. See ${add.outputFile}.`);
    }
    const message = `feat: ${slug(context.feature).replace(/-/g, " ")}`;
    const result = await git(context, "commit", ["commit", "-m", message]);
    if (result.exitCode !== 0) {
        throw new HumanReviewRequired(`Could not create the verified commit. See ${result.outputFile}.`);
    }
}
function isAutomaticRecoveryAllowed(review) {
    const category = review.humanReviewCategory ?? "reviewer_rejected_evidence";
    return category === "reviewer_rejected_evidence" || category === "tooling_failure";
}
async function redactRunArtifacts(context) {
    if (!(0, node_fs_1.existsSync)(context.runDirectory)) {
        return;
    }
    const files = await listTextArtifacts(context.runDirectory);
    for (const file of files) {
        const original = await (0, promises_1.readFile)(file, "utf8");
        const redacted = redactSecrets(original);
        if (redacted !== original) {
            await (0, promises_1.writeFile)(file, redacted, "utf8");
        }
    }
    const leaked = [];
    for (const file of files) {
        const text = await (0, promises_1.readFile)(file, "utf8");
        if (hasUnredactedSecretPattern(text)) {
            leaked.push(file);
        }
    }
    if (leaked.length > 0) {
        await appendEvent(context, "secret_scan_failed", { files: leaked });
        throw new HumanReviewRequired(`Secret scan found possible unredacted sensitive data in run artifacts: ${leaked.join(", ")}`, "security_risk");
    }
    await appendEvent(context, "secret_scan_passed");
}
async function listTextArtifacts(directory) {
    const output = [];
    const entries = await (0, promises_1.readdir)(directory, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = (0, node_path_1.join)(directory, entry.name);
        if (entry.isDirectory()) {
            output.push(...(await listTextArtifacts(fullPath)));
            continue;
        }
        if (/\.(jsonl|json|log|md|txt)$/i.test(entry.name)) {
            output.push(fullPath);
        }
    }
    return output;
}
function hasUnredactedSecretPattern(text) {
    const unredactedEnvAssignment = Array.from(sensitiveEnvironmentKeys).some((key) => new RegExp(`${key}\\s*=\\s*(?!\\[REDACTED\\])\\S+`, "i").test(text));
    return (unredactedEnvAssignment ||
        /postgres(?:ql)?:\/\/(?!\[REDACTED\])[^\\s"'`<>\\]+/i.test(text) ||
        /GOCSPX-[A-Za-z0-9_-]+/.test(text) ||
        /1\/\/[A-Za-z0-9_-]+/.test(text));
}
async function writeResult(context, status, detail) {
    await (0, promises_1.writeFile)((0, node_path_1.join)(context.runDirectory, "result.json"), `${JSON.stringify({ status, detail, finishedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
    await appendEvent(context, "run_finished", { status, detail });
}
async function main() {
    const root = (0, node_path_1.resolve)(process.cwd());
    let options;
    try {
        options = await parseOptions(process.argv.slice(2));
    }
    catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : "Invalid loop arguments"}\n`);
        process.exitCode = 1;
        return;
    }
    let loadedProject;
    try {
        loadedProject = await (0, project_config_1.loadProjectConfig)(root);
    }
    catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : "Invalid project configuration"}\n`);
        process.exitCode = 1;
        return;
    }
    registerSensitiveEnvironmentKeys(loadedProject.config.environment?.requiredVariables ?? []);
    if (options.validateProject) {
        process.stdout.write(`Project configuration valid: ${loadedProject.path}\n`);
        return;
    }
    const { feature, planFile, runtime } = options;
    if (!feature) {
        process.stderr.write("A feature is required unless --validate-project is used.\n");
        process.exitCode = 1;
        return;
    }
    const id = runId();
    const configuredUrl = process.env.AI_LOOP_HEALTH_URL ?? loadedProject.config.application?.healthUrl;
    const controlRoot = options.controlRoot ? (0, node_path_1.resolve)(options.controlRoot) : root;
    const environmentRoot = options.environmentRoot ? (0, node_path_1.resolve)(options.environmentRoot) : root;
    const runDirectory = (0, node_path_1.join)(controlRoot, ".ai-loop", "runs", id);
    await (0, promises_1.mkdir)(runDirectory, { recursive: true });
    const context = {
        root,
        controlRoot,
        environmentRoot,
        runDirectory,
        eventsFile: (0, node_path_1.join)(runDirectory, "events.jsonl"),
        feature,
        baseRevision: "",
        branch: "",
        runtime,
        project: loadedProject.config,
        verificationEnvironment: {
            ...process.env,
            ...(configuredUrl ? { PLAYWRIGHT_BASE_URL: configuredUrl } : {}),
        },
    };
    await (0, promises_1.writeFile)((0, node_path_1.join)(runDirectory, "feature.md"), `# Feature Request\n\n${feature}\n`, "utf8");
    await appendEvent(context, "run_started", { feature, healthUrl: configuredHealthUrl(context), runtime, project: context.project.project, version: "v3" });
    try {
        context.baseRevision = await gitOutput(context, "base-revision", ["rev-parse", "HEAD"]);
        await assertPreflight(context);
        context.branch = options.branch ?? `ai-loop/${slug(feature)}-${id.slice(0, 19)}`;
        if (options.branch) {
            const currentBranch = await gitOutput(context, "current-branch", ["branch", "--show-current"]);
            if (currentBranch !== options.branch) {
                throw new HumanReviewRequired(`Worktree is on ${currentBranch || "a detached HEAD"}, expected managed branch ${options.branch}.`, "tooling_failure");
            }
        }
        else {
            const branch = await git(context, "create-branch", ["switch", "-c", context.branch]);
            if (branch.exitCode !== 0) {
                throw new HumanReviewRequired(`Could not create feature branch ${context.branch}. See ${branch.outputFile}.`);
            }
        }
        const planSchema = schemaPath(context.root, "plan.schema.json");
        const resultSchema = schemaPath(context.root, "agent-result.schema.json");
        const plan = normalizePlan(planFile
            ? JSON.parse(await (0, promises_1.readFile)((0, node_path_1.resolve)(planFile), "utf8"))
            : (await invokeAgent(context, "plan", "read-only", planPrompt(context), planSchema)));
        validatePlan(plan, feature);
        await (0, promises_1.writeFile)((0, node_path_1.join)(context.runDirectory, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
        await appendEvent(context, "plan_accepted", { plan, source: planFile ? (0, node_path_1.resolve)(planFile) : "planner" });
        if (planTouchesDatabase(plan)) {
            await appendEvent(context, "lock_acquired", {
                lock: "db:global",
                reason: "Plan may touch database/schema/runtime DB state. DB-touching features must not run in parallel.",
            });
        }
        const completed = new Set();
        const evidence = [];
        while (completed.size < plan.steps.length) {
            const next = plan.steps.find((step) => !completed.has(step.id) && step.dependsOn.every((dependency) => completed.has(dependency)));
            if (!next) {
                throw new HumanReviewRequired("The plan has a dependency cycle and cannot be scheduled.");
            }
            evidence.push(...(await runStep(context, next, resultSchema)));
            completed.add(next.id);
        }
        if (context.project.verification.finalBuild) {
            const build = await runConfiguredCommand(context, "final-build", context.project.verification.finalBuild);
            evidence.push(build);
            if (build.exitCode !== 0) {
                throw new HumanReviewRequired(`Final build failed. See ${build.outputFile}.`);
            }
        }
        let review;
        for (let reviewAttempt = 1; reviewAttempt <= maxReviewAttempts; reviewAttempt += 1) {
            review = (await invokeAgent(context, `review-${reviewAttempt}`, "read-only", reviewPrompt(context, plan, evidence), resultSchema));
            if (!review.needsHumanReview && review.status === "completed") {
                break;
            }
            await appendEvent(context, "review_rejected", {
                attempt: reviewAttempt,
                category: review.humanReviewCategory ?? "reviewer_rejected_evidence",
                summary: review.summary,
                missingEvidence: review.missingEvidence ?? [],
            });
            if (review.needsHumanReview || !isAutomaticRecoveryAllowed(review) || reviewAttempt === maxReviewAttempts) {
                throw new HumanReviewRequired(`Reviewer did not approve the feature: ${review.summary}`, review.humanReviewCategory ?? "reviewer_rejected_evidence");
            }
            const recovery = (await invokeAgent(context, `recovery-${reviewAttempt}`, "workspace-write", recoveryPrompt(context, plan, review), resultSchema));
            if (recovery.needsHumanReview || recovery.status === "blocked") {
                throw new HumanReviewRequired(`Recovery requested human review: ${recovery.summary}`, recovery.humanReviewCategory ?? "reviewer_rejected_evidence");
            }
            const recoveryVerification = await verify(context, `recovery-${reviewAttempt}`);
            evidence.push(...recoveryVerification);
            const recoveryBuild = context.project.verification.finalBuild
                ? await runConfiguredCommand(context, `recovery-${reviewAttempt}-build`, context.project.verification.finalBuild)
                : undefined;
            if (recoveryBuild)
                evidence.push(recoveryBuild);
            if (failedChecks(recoveryVerification).length > 0 || recoveryBuild?.exitCode !== undefined && recoveryBuild.exitCode !== 0) {
                throw new HumanReviewRequired(`Recovery verification failed. Review logs in ${context.runDirectory}.`, "reviewer_rejected_evidence");
            }
        }
        await commit(context);
        await redactRunArtifacts(context);
        await writeResult(context, "completed", "Feature verified and committed on the feature branch.");
        process.stdout.write(`Completed. Audit trail: ${context.runDirectory}\n`);
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : "Unexpected failure";
        const status = error instanceof HumanReviewRequired ? "needs_human_review" : "failed";
        let finalDetail = detail;
        try {
            await redactRunArtifacts(context);
        }
        catch (redactionError) {
            finalDetail = `${detail}\nArtifact redaction/security scan also failed: ${redactionError instanceof Error ? redactionError.message : "unknown redaction failure"}`;
        }
        await writeResult(context, status, finalDetail);
        process.stderr.write(`${status}: ${detail}\nAudit trail: ${context.runDirectory}\n`);
        process.exitCode = status === "needs_human_review" ? 2 : 1;
    }
}
void main();
