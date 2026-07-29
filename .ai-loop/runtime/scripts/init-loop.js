"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const detect_project_1 = require("./detect-project");
function git(root, args) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = (0, node_child_process_1.spawn)("git", args, { cwd: root, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
        let output = "";
        child.stdout.on("data", (chunk) => { output += chunk.toString(); });
        child.stderr.on("data", (chunk) => { output += chunk.toString(); });
        child.on("error", rejectPromise);
        child.on("close", (code) => code === 0 ? resolvePromise(output.trim()) : rejectPromise(new Error(output.trim() || `git ${args.join(" ")} failed`)));
    });
}
async function main() {
    const args = process.argv.slice(2);
    const rootFlag = args.indexOf("--root");
    const root = (0, node_path_1.resolve)(rootFlag === -1 ? process.cwd() : args[rootFlag + 1] ?? process.cwd());
    const write = args.includes("--write");
    const force = args.includes("--force");
    const control = (0, node_path_1.join)(root, ".ai-loop");
    const projectPath = (0, node_path_1.join)(control, "project.json");
    const detection = await (0, detect_project_1.detectProject)(root);
    let targetBranch = "main";
    try {
        targetBranch = await git(root, ["branch", "--show-current"]);
    }
    catch {
        detection.ambiguities.push("Could not determine the current Git branch.");
    }
    const config = (0, detect_project_1.detectionToProjectConfig)(detection, targetBranch || "main");
    await (0, promises_1.mkdir)(control, { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(control, "discovery.json"), `${JSON.stringify({ root, detection, proposedConfig: config }, null, 2)}\n`, "utf8");
    if (!write) {
        process.stdout.write(`${JSON.stringify({ status: detection.ambiguities.length ? "needs_review" : "ready", discovery: (0, node_path_1.join)(control, "discovery.json"), ambiguities: detection.ambiguities }, null, 2)}\n`);
        return;
    }
    if (detection.ambiguities.length > 0)
        throw new Error(`Initialization needs review: ${detection.ambiguities.join(" ")}`);
    if ((0, node_fs_1.existsSync)(projectPath) && !force)
        throw new Error(".ai-loop/project.json already exists. Use --force only after reviewing the discovery report.");
    await (0, promises_1.writeFile)(projectPath, `${JSON.stringify({ $schema: "./project.schema.json", ...config }, null, 2)}\n`, "utf8");
    const schemaCandidates = [(0, node_path_1.join)(__dirname, "..", ".ai-loop", "project.schema.json"), (0, node_path_1.join)(__dirname, "..", "project.schema.json")];
    const schemaSource = schemaCandidates.find((candidate) => (0, node_fs_1.existsSync)(candidate));
    const schemaTarget = (0, node_path_1.join)(control, "project.schema.json");
    if (schemaSource && !(0, node_fs_1.existsSync)(schemaTarget))
        await (0, promises_1.copyFile)(schemaSource, schemaTarget);
    process.stdout.write(`Initialized ${projectPath}. Existing AGENTS.md and CLAUDE.md were not modified.\n`);
}
void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "Initialization failed"}\n`); process.exitCode = 1; });
