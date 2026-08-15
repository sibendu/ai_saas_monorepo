FROM node:24-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/bff/package.json apps/bff/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN npm ci
RUN mkdir -p apps/web/node_modules/@prisma \
  && ln -s /app/node_modules/@prisma/client apps/web/node_modules/@prisma/client

FROM deps AS builder

COPY apps/web apps/web
COPY scripts scripts
COPY packages/shared-types packages/shared-types

RUN npm run db:generate --workspace=apps/web
RUN npm run build --workspace=apps/web

FROM deps AS prod-deps

RUN npm ci --omit=dev --workspace=apps/web --workspace=packages/shared-types --include-workspace-root=false \
  && npm cache clean --force

FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/scripts ./apps/web/scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

WORKDIR /app/apps/web

USER nextjs

EXPOSE 3000

CMD ["node", "scripts/start-with-db.js"]
