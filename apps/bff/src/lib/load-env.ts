import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

function findWorkspaceRoot(): string {
  let currentDirectory = __dirname;

  while (true) {
    const packageJsonPath = path.join(currentDirectory, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
          workspaces?: unknown;
        };

        if (Array.isArray(packageJson.workspaces)) {
          return currentDirectory;
        }
      } catch {
        // Keep walking if this package.json is not readable.
      }
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return process.cwd();
    }

    currentDirectory = parentDirectory;
  }
}

const workspaceRoot = findWorkspaceRoot();
const envPaths = [path.join(workspaceRoot, '.env.local'), path.join(workspaceRoot, '.env')];
const originalNodeEnv = process.env.NODE_ENV;

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

if (originalNodeEnv === undefined) {
  delete process.env.NODE_ENV;
} else {
  process.env.NODE_ENV = originalNodeEnv;
}
