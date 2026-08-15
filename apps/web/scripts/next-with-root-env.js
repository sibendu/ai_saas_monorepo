require('../../../scripts/load-root-env')

const { spawnSync } = require('child_process')
const path = require('path')

const appRoot = path.resolve(__dirname, '..')
const nextCliPath = require.resolve('next/dist/bin/next', { paths: [appRoot] })
const args = process.argv.slice(2)
const nextCommand = args[0]

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
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

if (
  (nextCommand === 'dev' || nextCommand === 'start') &&
  (process.env.DB_BOOTSTRAP_ON_START === 'true' || process.env.DB_PROVIDER === 'sqlite')
) {
  run('node', ['prisma/bootstrap.js'])
}

run(process.execPath, [nextCliPath, ...args])
