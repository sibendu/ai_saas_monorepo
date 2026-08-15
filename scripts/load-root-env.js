const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

function findWorkspaceRoot(startDirectory = process.cwd()) {
  let currentDirectory = startDirectory

  while (true) {
    const packageJsonPath = path.join(currentDirectory, 'package.json')

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

        if (Array.isArray(packageJson.workspaces)) {
          return currentDirectory
        }
      } catch {
        // Keep walking if this package.json is not the workspace root.
      }
    }

    const parentDirectory = path.dirname(currentDirectory)

    if (parentDirectory === currentDirectory) {
      return process.cwd()
    }

    currentDirectory = parentDirectory
  }
}

function loadRootEnv() {
  const workspaceRoot = findWorkspaceRoot(__dirname)
  const envPaths = [path.join(workspaceRoot, '.env.local'), path.join(workspaceRoot, '.env')]
  const originalNodeEnv = process.env.NODE_ENV

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false })
    }
  }

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = originalNodeEnv
  }
}

loadRootEnv()

module.exports = {
  findWorkspaceRoot,
  loadRootEnv,
}
