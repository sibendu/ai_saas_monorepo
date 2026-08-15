const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
require('../../../scripts/load-root-env')

const appRoot = path.resolve(__dirname, '../../web')
const bffRoot = path.resolve(__dirname, '..')

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
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
  if (process.env.DB_SEED_ON_START === undefined) {
    process.env.DB_SEED_ON_START = 'false'
  }

  run('node', ['prisma/bootstrap.js'], appRoot)
}

const entryPoint = path.join(bffRoot, 'dist/index.js')

if (!fs.existsSync(entryPoint)) {
  console.error('BFF build output was not found at dist/index.js')
  process.exit(1)
}

run('node', ['dist/index.js'], bffRoot)
