import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function isSqliteProvider(): boolean {
  return process.env.DB_PROVIDER === 'sqlite' || process.env.DATABASE_URL?.startsWith('file:') === true
}

export function caseInsensitiveEquals(value: string) {
  return isSqliteProvider()
    ? { equals: value }
    : { equals: value, mode: 'insensitive' as const }
}
