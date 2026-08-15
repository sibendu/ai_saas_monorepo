const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
require('../../../scripts/load-root-env')

const prismaDir = __dirname
const appRoot = path.resolve(prismaDir, '..')
const baseSchemaPath = path.join(prismaDir, 'schema.prisma')
const generatedDir = path.join(prismaDir, '.generated')
const sqliteSchemaPath = path.join(generatedDir, 'schema.sqlite.prisma')

function normalizeProvider(value) {
  const provider = (value || '').toLowerCase().trim()

  if (provider === 'sqlite' || provider === 'demo') {
    return 'sqlite'
  }

  if (provider === 'postgres' || provider === 'postgresql') {
    return 'postgresql'
  }

  if ((process.env.DATABASE_URL || '').trim().startsWith('file:')) {
    return 'sqlite'
  }

  return 'postgresql'
}

function ensureSqliteDefaults() {
  if (process.env.DATABASE_URL) {
    return
  }

  const dataDir = path.join(prismaDir, 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  process.env.DATABASE_URL = 'file:../data/demo.db'
}

function buildSqliteSchema() {
  fs.mkdirSync(generatedDir, { recursive: true })

  const baseSchema = fs.readFileSync(baseSchemaPath, 'utf8')
  const sqliteSchema = baseSchema
    .replace('provider = "postgresql"', 'provider = "sqlite"')
    .replace(/enum\s+\w+\s+\{[\s\S]*?\}\s*/g, '')
    .replace('registrationType       RegistrationType @default(DIRECT)', 'registrationType       String           @default("DIRECT")')
    .replace('type         AddressType', 'type         String')
    .replace('type        ContactType', 'type        String')
    .replace('priority TaskPriority', 'priority String')
    .replace('action           AdminAuditAction', 'action           String')
    .replace('entityType       AdminAuditEntityType @map("entity_type")', 'entityType       String               @map("entity_type")')
    .replace('metadata         Json?', 'metadata         String?')
    .replace(/\s+@db\.VarChar\(\d+\)/g, '')

  fs.writeFileSync(sqliteSchemaPath, sqliteSchema)
}

function resolveSchemaPath() {
  const provider = normalizeProvider(process.env.DB_PROVIDER)

  if (provider === 'sqlite') {
    ensureSqliteDefaults()
    buildSqliteSchema()
    return sqliteSchemaPath
  }

  return baseSchemaPath
}

function runPrisma(args) {
  const schemaPath = resolveSchemaPath()
  process.env.PRISMA_SCHEMA = schemaPath
  const prismaCliPath = require.resolve('prisma/build/index.js', { paths: [appRoot] })
  const commandArgs = [prismaCliPath, ...args, '--schema', schemaPath]
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: appRoot,
    env: process.env,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  process.exit(result.status ?? 1)
}

if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: node prisma/run-prisma.js <prisma command>')
    process.exit(1)
  }

  runPrisma(args)
}

module.exports = {
  normalizeProvider,
  resolveSchemaPath,
}
