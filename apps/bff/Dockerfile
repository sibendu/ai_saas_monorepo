FROM node:24-alpine AS deps

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/bff/package.json apps/bff/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN npm ci
RUN mkdir -p apps/web/node_modules/@prisma \
  && ln -s /app/node_modules/@prisma/client apps/web/node_modules/@prisma/client

FROM deps AS builder

COPY apps/web/prisma apps/web/prisma
COPY apps/bff apps/bff
COPY packages/shared-types packages/shared-types

RUN npm run build --workspace=packages/shared-types
RUN npm exec --workspace=apps/web -- prisma generate
RUN npm run build --workspace=apps/bff

FROM node:24-alpine AS prod-deps

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/bff/package.json apps/bff/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN npm ci --omit=dev --workspace=apps/bff --workspace=packages/shared-types --include-workspace-root=false \
  && npm cache clean --force

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV WEB_APP_URL=http://localhost:3000

RUN apk add --no-cache openssl \
  && addgroup -S -g 1001 nodejs \
  && adduser -S -u 1001 -G nodejs nodejs

COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=prod-deps --chown=nodejs:nodejs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nodejs:nodejs /app/apps/bff/package.json ./apps/bff/package.json
COPY --from=builder --chown=nodejs:nodejs /app/apps/bff/dist ./apps/bff/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared-types/dist ./packages/shared-types/dist

WORKDIR /app/apps/bff

USER nodejs

EXPOSE 3001

CMD ["node", "dist/index.js"]
