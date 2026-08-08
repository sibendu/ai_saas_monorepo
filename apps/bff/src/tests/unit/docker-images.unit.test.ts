import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('production Docker image configuration', () => {
  it('keeps local, generated, secret, and runtime folders out of root Docker contexts', () => {
    const dockerignore = readRepoFile('.dockerignore');

    [
      'node_modules/',
      'apps/*/node_modules/',
      '.next/',
      'dist/',
      'build/',
      'coverage/',
      'reports/',
      '.git/',
      '.env*',
      '_bmad/',
      '_bmad-ui/',
      '_bmad-output/',
      '.agents/',
      '.claude/',
      '.opencode/',
      'graphify-out/',
    ].forEach((pattern) => {
      expect(dockerignore).toContain(pattern);
    });

    expect(dockerignore).not.toContain('package.json');
    expect(dockerignore).not.toContain('package-lock.json');
    expect(dockerignore).not.toContain('packages/shared-types');
    expect(dockerignore).not.toContain('apps/web/prisma');
  });

  it('enables Next.js standalone output for the web workspace', () => {
    const nextConfig = readRepoFile('apps/web/next.config.js');

    expect(nextConfig).toContain('reactStrictMode: true');
    expect(nextConfig).toContain("transpilePackages: ['@saas/shared-types']");
    expect(nextConfig).toContain("output: 'standalone'");
    expect(nextConfig).toContain('outputFileTracingRoot');
  });

  it('defines a production multi-stage web image from the repository root context', () => {
    const dockerfile = readRepoFile('apps/web/Dockerfile');

    expect(dockerfile).toMatch(/FROM node:\d+-bookworm-slim AS deps/);
    expect(dockerfile).toContain('FROM deps AS builder');
    expect(dockerfile).toContain('FROM node:');
    expect(dockerfile).toContain('AS runner');
    expect(dockerfile).toContain('npm ci');
    expect(dockerfile).toContain('npm exec --workspace=apps/web -- prisma generate');
    expect(dockerfile).toContain('npm run build --workspace=apps/web');
    expect(dockerfile).toContain('.next/standalone');
    expect(dockerfile).toContain('.next/static');
    expect(dockerfile).toContain('apps/web/public');
    expect(dockerfile).toContain('NODE_ENV=production');
    expect(dockerfile).toContain('PORT=3000');
    expect(dockerfile).toContain('HOSTNAME=0.0.0.0');
    expect(dockerfile).toContain('EXPOSE 3000');
    expect(dockerfile).toContain('USER nextjs');
    expect(dockerfile).toContain('CMD ["node", "server.js"]');
  });

  it('defines a production multi-stage BFF image that runs compiled JavaScript', () => {
    const dockerfile = readRepoFile('apps/bff/Dockerfile');

    expect(dockerfile).toMatch(/FROM node:\d+-alpine AS deps/);
    expect(dockerfile).toContain('FROM deps AS builder');
    expect(dockerfile).toContain('FROM node:24-alpine AS prod-deps');
    expect(dockerfile).toContain('FROM node:');
    expect(dockerfile).toContain('AS runner');
    expect(dockerfile).toContain('apk add --no-cache openssl');
    expect(dockerfile).toContain('npm ci');
    expect(dockerfile).toContain('npm run build --workspace=packages/shared-types');
    expect(dockerfile).toContain('npm exec --workspace=apps/web -- prisma generate');
    expect(dockerfile).toContain('npm run build --workspace=apps/bff');
    expect(dockerfile).toContain('npm ci --omit=dev --workspace=apps/bff');
    expect(dockerfile).toContain('apps/bff/dist');
    expect(dockerfile).toContain('packages/shared-types/dist');
    expect(dockerfile).toContain('NODE_ENV=production');
    expect(dockerfile).toContain('PORT=3001');
    expect(dockerfile).toContain('EXPOSE 3001');
    expect(dockerfile).toContain('USER nodejs');
    expect(dockerfile).toContain('CMD ["node", "dist/index.js"]');
  });

  it('uses the package Prisma client import in the BFF singleton', () => {
    const prismaSingleton = readRepoFile('apps/bff/src/lib/prisma.ts');

    expect(prismaSingleton).toContain("import { PrismaClient as GeneratedPrismaClient } from '@prisma/client'");
    expect(prismaSingleton).toContain("import './load-env'");
    expect(prismaSingleton).toContain('globalForPrisma.prisma');
    expect(prismaSingleton).toContain("log: ['error', 'warn']");
  });
});
