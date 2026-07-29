"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectProject = detectProject;
exports.detectionToProjectConfig = detectionToProjectConfig;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
function command(id, executable, args) {
    return { id, executable, args };
}
function hasAny(root, names) {
    return names.some((name) => (0, node_fs_1.existsSync)((0, node_path_1.join)(root, name)));
}
function rootFiles(root) {
    try {
        return (0, node_fs_1.readdirSync)(root, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name);
    }
    catch {
        return [];
    }
}
async function detectProject(root) {
    const technologies = [];
    const packageManagers = [];
    const preflight = [command("node", "node", ["--version"]), command("git", "git", ["--version"])];
    const verification = [];
    let finalBuild;
    let database;
    let browser;
    let application;
    const ambiguities = [];
    const environment = (0, node_fs_1.existsSync)((0, node_path_1.join)(root, ".env")) || (0, node_fs_1.existsSync)((0, node_path_1.join)(root, ".env.example")) ? { file: ".env", requiredVariables: [] } : undefined;
    const files = rootFiles(root);
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "package.json"))) {
        technologies.push("Node.js");
        const packageRaw = JSON.parse(await (0, promises_1.readFile)((0, node_path_1.join)(root, "package.json"), "utf8"));
        const scripts = packageRaw.scripts ?? {};
        const dependencies = { ...(packageRaw.dependencies ?? {}), ...(packageRaw.devDependencies ?? {}) };
        const manager = (0, node_fs_1.existsSync)((0, node_path_1.join)(root, "pnpm-lock.yaml")) ? "pnpm" : (0, node_fs_1.existsSync)((0, node_path_1.join)(root, "yarn.lock")) ? "yarn" : (0, node_fs_1.existsSync)((0, node_path_1.join)(root, "package-lock.json")) ? "npm" : "npm";
        packageManagers.push(manager);
        preflight.push(command(manager, manager, ["--version"]));
        if (dependencies.next)
            technologies.push("Next.js");
        if (dependencies.vite)
            technologies.push("Vite");
        if (dependencies["@playwright/test"] || (0, node_fs_1.existsSync)((0, node_path_1.join)(root, "playwright.config.ts"))) {
            browser = { required: true, testFramework: "playwright", executablePathEnvironmentVariable: "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH", disableVideoWithoutFfmpeg: true };
        }
        for (const [script, id] of [["lint", "lint"], ["typecheck", "typecheck"], ["test", "test"], ["test:e2e", "e2e"]]) {
            if (scripts[script])
                verification.push(command(id, manager, ["run", script]));
        }
        if (scripts.build)
            finalBuild = command("build", manager, ["run", "build"]);
        if (dependencies.prisma || (0, node_fs_1.existsSync)((0, node_path_1.join)(root, "prisma"))) {
            technologies.push("Prisma");
            database = { provider: "postgresql", urlVariable: "DATABASE_URL", localOnly: true, migrationStatus: scripts["db:migrate:status"] ? command("db-migrate-status", manager, ["run", "db:migrate:status"]) : undefined };
            if (scripts["db:generate"])
                verification.push(command("db-generate", manager, ["run", "db:generate"]));
        }
        if (scripts.dev && dependencies.next)
            application = { healthUrl: "http://localhost:3000", waitForHealthMs: 30_000 };
        return {
            project: { name: packageRaw.name ?? "application", architecture: technologies.join(" with ") || "Node.js application" },
            packageManagers,
            technologies,
            commands: { preflight, verification, finalBuild },
            database,
            browser,
            application,
            environment,
            ambiguities: verification.length === 0 ? ["No standard verification script was detected; add one or more verification commands."] : ambiguities,
        };
    }
    if (hasAny(root, ["pyproject.toml", "requirements.txt", "setup.py"])) {
        technologies.push("Python");
        packageManagers.push((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "pyproject.toml")) ? "pyproject" : "pip");
        preflight.push(command("python", "python", ["--version"]));
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "pytest.ini")) || files.some((file) => file.startsWith("test_")))
            verification.push(command("pytest", "python", ["-m", "pytest"]));
    }
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "go.mod"))) {
        technologies.push("Go");
        packageManagers.push("go modules");
        preflight.push(command("go", "go", ["version"]));
        verification.push(command("go-test", "go", ["test", "./..."]));
    }
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "Cargo.toml"))) {
        technologies.push("Rust");
        packageManagers.push("cargo");
        preflight.push(command("cargo", "cargo", ["--version"]));
        verification.push(command("cargo-test", "cargo", ["test"]));
    }
    if (files.some((file) => file.endsWith(".csproj"))) {
        technologies.push(".NET");
        preflight.push(command("dotnet", "dotnet", ["--version"]));
        verification.push(command("dotnet-test", "dotnet", ["test"]));
        finalBuild = command("dotnet-build", "dotnet", ["build", "--no-restore"]);
    }
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "pom.xml"))) {
        technologies.push("Java/Maven");
        preflight.push(command("maven", "mvn", ["--version"]));
        verification.push(command("maven-test", "mvn", ["test"]));
    }
    if (technologies.length === 0)
        ambiguities.push("No supported application runtime was detected.");
    if (verification.length === 0)
        ambiguities.push("No verification command could be detected automatically.");
    return {
        project: { name: "application", architecture: technologies.join(" with ") || "Undetected architecture" },
        packageManagers,
        technologies,
        commands: { preflight, verification, finalBuild },
        environment,
        ambiguities,
    };
}
function detectionToProjectConfig(detection, targetBranch) {
    return {
        version: 1,
        project: detection.project,
        environment: detection.environment,
        application: detection.application,
        database: detection.database,
        browser: detection.browser,
        concurrency: { maxWorkers: 2, verificationDatabaseAccess: detection.database ? "unknown" : "none" },
        integration: { targetBranch, autoMerge: true, attemptConflictResolution: true },
        preflight: { commands: detection.commands.preflight },
        verification: { commands: detection.commands.verification, finalBuild: detection.commands.finalBuild },
    };
}
