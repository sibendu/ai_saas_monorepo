const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
require('../../../scripts/load-root-env')

const appRoot = path.resolve(__dirname, '..')

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    env: process.env,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (process.env.DB_BOOTSTRAP_ON_START === 'true' || process.env.DB_PROVIDER === 'sqlite') {
  run('node', ['prisma/bootstrap.js'])
}

const standaloneServer = path.join(appRoot, 'server.js')

if (fs.existsSync(standaloneServer)) {
  run('node', ['server.js'])
} else {
  const nextCliPath = require.resolve('next/dist/bin/next', { paths: [appRoot] })
  run(process.execPath, [nextCliPath, 'start'])
}
