const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { normalizeProvider, resolveSchemaPath } = require('./run-prisma')
const { createSqliteSchema } = require('./sqlite-schema')

const appRoot = path.resolve(__dirname, '..')
const provider = normalizeProvider(process.env.DB_PROVIDER)
const schemaPath = resolveSchemaPath()
process.env.PRISMA_SCHEMA = schemaPath

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    env: process.env,
    stdio: 'inherit',
    ...options,
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function runPrisma(args) {
  const prismaCliPath = require.resolve('prisma/build/index.js', { paths: [appRoot] })
  run(process.execPath, [prismaCliPath, ...args, '--schema', schemaPath])
}

if (process.env.DB_SKIP_GENERATE !== 'true') {
  runPrisma(['generate'])
}

if (provider === 'sqlite') {
  const databaseUrl = process.env.DATABASE_URL || 'file:../data/demo.db'

  if (databaseUrl.startsWith('file:')) {
    const sqliteFile = databaseUrl.slice('file:'.length)
    const sqlitePath = path.isAbsolute(sqliteFile)
      ? sqliteFile
      : path.resolve(path.dirname(schemaPath), sqliteFile)

    fs.mkdirSync(path.dirname(sqlitePath), { recursive: true })
  }

  createSqliteSchema(databaseUrl, schemaPath)

  if (process.env.DB_SEED_ON_START !== 'false') {
    run('node', ['prisma/seed.js'])
  }
} else if (process.env.DB_MIGRATE_ON_START === 'true') {
  runPrisma(['migrate', 'deploy'])
}
