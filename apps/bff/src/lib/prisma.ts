import './load-env';
import { PrismaClient as GeneratedPrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: GeneratedPrismaClient | undefined;
};

export type PrismaClient = GeneratedPrismaClient;

export function getPrismaClient(): GeneratedPrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new GeneratedPrismaClient({
      log: ['error', 'warn'],
    });
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as GeneratedPrismaClient, {
  get(_target, property) {
    return getPrismaClient()[property as keyof GeneratedPrismaClient];
  },
});
