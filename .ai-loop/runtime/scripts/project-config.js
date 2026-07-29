"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadProjectConfig = loadProjectConfig;
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertString(value, path) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${path} must be a non-empty string.`);
    }
}
function assertStringArray(value, path) {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        throw new Error(`${path} must be an array of strings.`);
    }
}
function validateCommand(value, path) {
    if (!isRecord(value)) {
        throw new Error(`${path} must be an object.`);
    }
    assertString(value.id, `${path}.id`);
    assertString(value.executable, `${path}.executable`);
    assertStringArray(value.args, `${path}.args`);
    if (value.required !== undefined && typeof value.required !== "boolean") {
        throw new Error(`${path}.required must be a boolean.`);
    }
}
async function loadProjectConfig(root) {
    const path = (0, node_path_1.join)(root, ".ai-loop", "project.json");
    if (!(0, node_fs_1.existsSync)(path)) {
        throw new Error("Missing .ai-loop/project.json. Add a project configuration before starting the feature loop.");
    }
    let raw;
    try {
        raw = JSON.parse(await (0, promises_1.readFile)(path, "utf8"));
    }
    catch {
        throw new Error(".ai-loop/project.json must contain valid JSON.");
    }
    if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.project) || !isRecord(raw.verification)) {
        throw new Error(".ai-loop/project.json must use version 1 and include project and verification objects.");
    }
    assertString(raw.project.name, "project.name");
    assertString(raw.project.architecture, "project.architecture");
    if (!Array.isArray(raw.verification.commands) || raw.verification.commands.length === 0) {
        throw new Error("verification.commands must contain at least one command.");
    }
    raw.verification.commands.forEach((item, index) => validateCommand(item, `verification.commands[${index}]`));
    if (raw.verification.finalBuild !== undefined) {
        validateCommand(raw.verification.finalBuild, "verification.finalBuild");
    }
    if (raw.environment !== undefined) {
        if (!isRecord(raw.environment))
            throw new Error("environment must be an object.");
        if (raw.environment.file !== undefined)
            assertString(raw.environment.file, "environment.file");
        if (raw.environment.requiredVariables !== undefined) {
            assertStringArray(raw.environment.requiredVariables, "environment.requiredVariables");
        }
    }
    if (raw.application !== undefined) {
        if (!isRecord(raw.application))
            throw new Error("application must be an object.");
        if (raw.application.healthUrl !== undefined)
            assertString(raw.application.healthUrl, "application.healthUrl");
        if (raw.application.waitForHealthMs !== undefined) {
            const waitForHealthMs = raw.application.waitForHealthMs;
            if (typeof waitForHealthMs !== "number" || !Number.isInteger(waitForHealthMs) || waitForHealthMs < 0) {
                throw new Error("application.waitForHealthMs must be a non-negative integer.");
            }
        }
    }
    if (raw.database !== undefined) {
        if (!isRecord(raw.database))
            throw new Error("database must be an object.");
        assertString(raw.database.provider, "database.provider");
        if (raw.database.urlVariable !== undefined)
            assertString(raw.database.urlVariable, "database.urlVariable");
        if (raw.database.localOnly !== undefined && typeof raw.database.localOnly !== "boolean") {
            throw new Error("database.localOnly must be a boolean.");
        }
        if (raw.database.migrationStatus !== undefined)
            validateCommand(raw.database.migrationStatus, "database.migrationStatus");
    }
    if (raw.browser !== undefined) {
        if (!isRecord(raw.browser))
            throw new Error("browser must be an object.");
        if (raw.browser.required !== undefined && typeof raw.browser.required !== "boolean")
            throw new Error("browser.required must be a boolean.");
        if (raw.browser.testFramework !== undefined)
            assertString(raw.browser.testFramework, "browser.testFramework");
        if (raw.browser.executablePathEnvironmentVariable !== undefined)
            assertString(raw.browser.executablePathEnvironmentVariable, "browser.executablePathEnvironmentVariable");
        if (raw.browser.disableVideoWithoutFfmpeg !== undefined && typeof raw.browser.disableVideoWithoutFfmpeg !== "boolean") {
            throw new Error("browser.disableVideoWithoutFfmpeg must be a boolean.");
        }
    }
    if (raw.preflight !== undefined) {
        if (!isRecord(raw.preflight) || !Array.isArray(raw.preflight.commands)) {
            throw new Error("preflight.commands must be an array of commands.");
        }
        raw.preflight.commands.forEach((item, index) => validateCommand(item, `preflight.commands[${index}]`));
    }
    if (raw.concurrency !== undefined) {
        if (!isRecord(raw.concurrency))
            throw new Error("concurrency must be an object.");
        const maxWorkers = raw.concurrency.maxWorkers;
        if (maxWorkers !== undefined && (typeof maxWorkers !== "number" || !Number.isInteger(maxWorkers) || maxWorkers < 1 || maxWorkers > 8)) {
            throw new Error("concurrency.maxWorkers must be an integer from 1 to 8.");
        }
        const databaseAccess = raw.concurrency.verificationDatabaseAccess;
        if (databaseAccess !== undefined && !["none", "read", "write", "unknown"].includes(String(databaseAccess))) {
            throw new Error("concurrency.verificationDatabaseAccess must be none, read, write, or unknown.");
        }
    }
    if (raw.integration !== undefined) {
        if (!isRecord(raw.integration))
            throw new Error("integration must be an object.");
        if (raw.integration.targetBranch !== undefined)
            assertString(raw.integration.targetBranch, "integration.targetBranch");
        for (const key of ["autoMerge", "attemptConflictResolution"]) {
            if (raw.integration[key] !== undefined && typeof raw.integration[key] !== "boolean") {
                throw new Error(`integration.${key} must be a boolean.`);
            }
        }
    }
    return { config: raw, path: (0, node_path_1.resolve)(path) };
}
