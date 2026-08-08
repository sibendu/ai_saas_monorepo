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
COPY packages/shared-types packages/shared-types

RUN npm exec --workspace=apps/web -- prisma generate
RUN npm run build --workspace=apps/web

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

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/package.json

WORKDIR /app/apps/web

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
