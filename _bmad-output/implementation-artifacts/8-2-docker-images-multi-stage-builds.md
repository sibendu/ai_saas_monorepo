---
baseline_commit: 352a31537ed26ca1894db0d32fb03ff98cb9ae20
---

# Story 8.2: Docker Images (Multi-Stage Builds)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want production-ready multi-stage Docker images for the web app and BFF,
so that the SaaS foundation can build, ship, and run each service independently with small, repeatable runtime images.

## Acceptance Criteria

1. `apps/web/Dockerfile` builds successfully from the repository root with `docker build -f apps/web/Dockerfile -t saas-web:8-2 .`.
2. The web image uses a multi-stage build and a minimal runtime stage that runs the production Next.js server on port `3000`.
3. The web runtime uses Next.js standalone output, includes required static/public assets, and does not require the full source tree or dev dependencies at runtime.
4. `apps/bff/Dockerfile` builds successfully from the repository root with `docker build -f apps/bff/Dockerfile -t saas-bff:8-2 .`.
5. The BFF image uses a multi-stage build and a minimal runtime stage that runs compiled JavaScript with `node dist/index.js` on port `3001`.
6. The BFF container starts successfully and `GET /health` returns HTTP 200 with the existing JSON health payload.
7. Prisma Client generation is handled during image build for all runtime code that imports Prisma; no container starts with an ungenerated or missing Prisma client.
8. Image builds do not bake secrets, local `.env*` values, `node_modules`, build output, test reports, coverage, or git metadata into the Docker build context.
9. Final image sizes meet the Epic 8 thresholds: web image under `500MB`; BFF image under `300MB`.
10. Verification commands are documented in the story completion notes when implemented, including image build, container startup, health check, and image size checks.

## Tasks / Subtasks

- [x] Add a repository-root `.dockerignore` for root-context builds. (AC: 8)
  - [x] Exclude `node_modules/`, `apps/*/node_modules/`, `.next/`, `dist/`, `build/`, `coverage/`, `reports/`, `.git/`, `.env*`, logs, and local agent/runtime output folders.
  - [x] Keep required manifests and source files available to both Dockerfiles: root `package.json`, `package-lock.json`, workspace package manifests, app source, `packages/shared-types`, and `apps/web/prisma`.
- [x] Update `apps/web/next.config.js` for container-ready standalone output. (AC: 2, 3)
  - [x] Preserve the existing `reactStrictMode: true` and `transpilePackages: ['@saas/shared-types']`.
  - [x] Add `output: 'standalone'`.
  - [x] Because `apps/web` is inside an npm workspace monorepo, add `outputFileTracingRoot` pointing at the repository root if the standalone build does not include workspace dependencies or required traced files.
- [x] Create `apps/web/Dockerfile`. (AC: 1, 2, 3, 7, 8, 9)
  - [x] Build from the repository root, not from `apps/web`, so npm workspaces and `packages/shared-types` resolve correctly.
  - [x] Use a current supported Node LTS base consistently across stages; prefer a slim Debian-based official Node image for Prisma compatibility unless local verification proves Alpine works.
  - [x] Install dependencies with the root lockfile using `npm ci`.
  - [x] Generate Prisma Client from `apps/web/prisma/schema.prisma` during the build stage before any code path that needs generated Prisma types/client.
  - [x] Run the existing web build script: `npm run build --workspace=apps/web`.
  - [x] Copy only standalone runtime output, `.next/static`, `public`, and required package metadata into the runtime stage.
  - [x] Set runtime env defaults: `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`; do not hardcode secrets or production URLs.
  - [x] Run as a non-root user in the runtime stage.
- [x] Create `apps/bff/Dockerfile`. (AC: 4, 5, 6, 7, 8, 9)
  - [x] Build from the repository root so `@saas/shared-types` and workspace dependency layout are available.
  - [x] Install dependencies with the root lockfile using `npm ci`.
  - [x] Build `packages/shared-types` before building the BFF if TypeScript resolution requires `packages/shared-types/dist`.
  - [x] Generate Prisma Client from `apps/web/prisma/schema.prisma` during the build stage.
  - [x] Run `npm run build --workspace=apps/bff`.
  - [x] Ensure the BFF runtime image contains `apps/bff/dist`, production dependencies, `packages/shared-types/dist`, and the generated Prisma client in the path used by the BFF.
  - [x] Preserve the current BFF startup contract: `node dist/index.js`, `PORT=3001`, and `WEB_APP_URL`-restricted CORS.
  - [x] Run as a non-root user in the runtime stage.
- [x] Resolve the BFF Prisma-client path deliberately. (AC: 4, 5, 6, 7)
  - [x] Current code imports Prisma from `apps/web/node_modules/.prisma/client` in `apps/bff/src/lib/prisma.ts`; a runtime image must either preserve that generated path or change the import to a tested, less fragile package import.
  - [x] If changing `apps/bff/src/lib/prisma.ts`, preserve its lazy singleton behavior, `load-env` import, and existing testability.
  - [x] Do not leave the BFF image in a state where TypeScript builds but runtime fails with "Prisma Client did not initialize yet."
- [x] Verify images and runtime behavior. (AC: 1, 4, 6, 9, 10)
  - [x] Run `docker build -f apps/web/Dockerfile -t saas-web:8-2 .`.
  - [x] Run `docker build -f apps/bff/Dockerfile -t saas-bff:8-2 .`.
  - [x] Check image sizes with `docker image inspect saas-web:8-2 saas-bff:8-2 --format "{{.Repository}}:{{.Tag}} {{.Size}}"`.
  - [x] Run the BFF image with runtime `DATABASE_URL` and `WEB_APP_URL`, then verify `/health`.
  - [x] Run the web image with runtime `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, and `BFF_INTERNAL_URL` or `NEXT_PUBLIC_BFF_URL`, then verify the service listens on `3000`.
  - [x] Run `npm run type-check` after any source/config edits.

## Dev Notes

### Epic and Business Context

- Epic 8 provides deployment, database, and testing scripts so the foundation is deployable through Docker Compose and Kubernetes. Story 8.2 is specifically limited to production Docker images for the two app services. [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md#Epic 8: Deployment, Database & Testing Scripts`]
- The required deliverables are `apps/web/Dockerfile` and `apps/bff/Dockerfile`; Kubernetes manifests, backup/restore scripts, seed script work, smoke test suites, and deployment documentation belong to later Epic 8 stories unless a small note is needed for image verification. [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md#Story 8.2: Docker Images (Multi-Stage Builds)`]
- The target architecture is two independently scalable stateless services: Next.js web on `3000`, Express BFF on `3001`, and PostgreSQL via Prisma. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#Paradigm`]

### Current Repository State

- No Dockerfiles or `.dockerignore` files currently exist in tracked non-excluded source paths. Add new Docker assets rather than editing nonexistent partial files.
- Root package management is npm workspaces with `apps/*` and `packages/*`. Use the root `package-lock.json`; do not introduce pnpm/yarn Docker flows just because `pnpm-lock.yaml` is present. [Source: `package.json`]
- Root scripts already provide the intended build entrypoints:
  - `npm run build:web`
  - `npm run build:bff`
  - `npm run db:generate`
  - `npm run type-check`
  [Source: `package.json`]
- `apps/web/next.config.js` currently contains only `reactStrictMode: true` and `transpilePackages: ['@saas/shared-types']`. Preserve both when adding standalone output. [Source: `apps/web/next.config.js`]
- `apps/bff/package.json` starts production with `node dist/index.js`; the Dockerfile must honor that contract rather than running `tsx` or TypeScript source in production. [Source: `apps/bff/package.json`]
- `apps/bff/src/index.ts` exposes `/health`, defaults `PORT` to `3001`, uses Helmet, Morgan, JSON parsing, and CORS restricted by `WEB_APP_URL || 'http://localhost:3000'`. Preserve this runtime behavior. [Source: `apps/bff/src/index.ts`]

### Files to Create or Update

- Create `apps/web/Dockerfile`.
- Create `apps/bff/Dockerfile`.
- Create repository-root `.dockerignore`.
- Update `apps/web/next.config.js` if required for Next standalone output.
- Update `apps/bff/src/lib/prisma.ts` only if the Docker runtime cannot reliably preserve the existing generated-client import path.

### Existing Code That Must Be Preserved

- `apps/bff/src/lib/load-env.ts` loads BFF env files and falls back to web env files during local development. Container images must still rely on runtime environment variables; do not copy `.env` files into images. [Source: `apps/bff/src/lib/load-env.ts`]
- `apps/bff/src/lib/prisma.ts` currently lazy-creates one Prisma client instance and logs `error` and `warn`. If touched, preserve the singleton pattern and runtime logging behavior. [Source: `apps/bff/src/lib/prisma.ts`]
- `apps/web/prisma/schema.prisma` is the current Prisma schema and generator location. Docker builds must use this schema for client generation. [Source: `apps/web/prisma/schema.prisma`]
- `apps/web/prisma/seed.js` exists for seed data but does not belong in Docker image startup for this story. Database seeding is covered by Story 8.5. [Source: `apps/web/prisma/seed.js`]

### Architecture Guardrails

- Keep web and BFF as separate deployable images. Do not collapse them into one container or use a process manager to run both services in one image. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-01: Monorepo BFF Paradigm`]
- BFF remains private and should not be documented as a public internet-facing service. Its exposed container port is for private networking or local verification. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-04: BFF as Private Service`]
- Do not run migrations or seed data as part of image build. Image builds must be deterministic and not require a reachable database. Runtime/deployment migration execution is separate via `npm run db:deploy`. [Source: `package.json`; `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#Open Questions & Assumptions`]
- Secrets must be injected at runtime by Compose/Kubernetes/environment management. Never copy `.env`, `.env.local`, OAuth secrets, `NEXTAUTH_SECRET`, or `DATABASE_URL` into image layers. [Source: `docs/project-context.md#Security Gotchas`]
- Maintain the locked ports: web `3000`, BFF `3001`, PostgreSQL external dependency `5432`. [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#Product Overview`]

### Docker and Runtime Requirements

- Use named Docker stages, for example `deps`, `builder`, and `runner`, so copy instructions are robust if stages are reordered.
- Use `npm ci`, not `npm install`, inside Docker builds because a root `package-lock.json` exists.
- Runtime stages should contain only what is needed to run the built service: compiled artifacts, production dependencies or traced standalone files, package metadata needed by Node resolution, and Prisma generated artifacts.
- Runtime images should set `NODE_ENV=production` and run as a non-root user.
- Use one Node base-image family across web and BFF to reduce drift. The old `DEPLOYMENT.md` snippet uses `node:18-alpine`; treat it as stale guidance for this story because current Docker/Prisma guidance favors current LTS images and this repo now uses Next.js 16.1.6 and Prisma 6.19.2. [Source: `DEPLOYMENT.md`; `docs/project-context.md#Technology Stack & Versions`]
- Prefer Debian slim over Alpine if Prisma native engine resolution is unreliable; if using Alpine, prove the generated Prisma client works in both containers before marking complete.

### Latest Technical Information

- Docker multi-stage builds should use multiple `FROM` stages and copy only selected build artifacts into the runtime image, leaving build tools and intermediate files behind. [Source: Docker Docs, Multi-stage builds: https://docs.docker.com/build/building/multi-stage/]
- Docker build best practices recommend small trusted base images, separate build and runtime stages, `.dockerignore`, and avoiding unnecessary packages in final images. [Source: Docker Docs, Building best practices: https://docs.docker.com/build/building/best-practices/]
- Docker's current Next.js guide recommends production images using multi-stage builds and Next.js standalone output for efficient self-hosted containers. [Source: Docker Docs, Containerize a Next.js application: https://docs.docker.com/guides/nextjs/]
- Next.js standalone output creates a `.next/standalone` folder with the files needed for production deployment; static assets and `public` may still need explicit copy steps. [Source: Next.js output config: https://nextjs.org/docs/app/api-reference/config/next-config-js/output]
- Prisma Docker deployments must ensure Prisma Client is generated inside the image build/runtime environment and available where application code imports it. [Source: Prisma Docker guide: https://www.prisma.io/docs/guides/deployment/docker]

### Testing Requirements

- Run repository type checking after any TypeScript or config changes: `npm run type-check`.
- Build both images from the repo root:
  - `docker build -f apps/web/Dockerfile -t saas-web:8-2 .`
  - `docker build -f apps/bff/Dockerfile -t saas-bff:8-2 .`
- Verify image sizes:
  - `docker image inspect saas-web:8-2 saas-bff:8-2 --format "{{.Repository}}:{{.Tag}} {{.Size}}"`
- Verify BFF runtime:
  - Run with `PORT=3001`, `WEB_APP_URL=http://localhost:3000`, and a valid `DATABASE_URL`.
  - Request `http://localhost:3001/health` and confirm HTTP 200 plus the existing `status`, `service`, and `timestamp` payload.
- Verify web runtime:
  - Run with `PORT=3000`, `HOSTNAME=0.0.0.0`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, and `BFF_INTERNAL_URL` or `NEXT_PUBLIC_BFF_URL`.
  - Confirm the server listens on `3000`. If full page load requires a live database/BFF, document the exact dependency state used during verification.
- Do not mark image-size ACs complete from assumptions; record actual image inspect output in the Dev Agent Record.

### Previous Story Intelligence

- Sprint status shows `8-1-docker-compose-setup-local-dev` as `in-progress`, but no `8-1-*.md` implementation artifact currently exists under `_bmad-output/implementation-artifacts`. There are also no discovered `docker-compose*.yml` files in non-excluded source paths. Treat compose integration as unresolved context and do not depend on a completed compose file for this story.
- Recent commits are focused on admin audit trail and admin UI/API fixes, not deployment. Relevant pattern: changes include focused unit tests and shared-type updates when contracts change. Do not infer Docker patterns from those commits.

### Project Structure Notes

- Use repository-root Docker build context for both app Dockerfiles. Workspace package resolution depends on root manifests and `packages/shared-types`.
- Keep Dockerfiles next to their services as specified by the epic:
  - `apps/web/Dockerfile`
  - `apps/bff/Dockerfile`
- Keep shared workspace artifacts in `packages/shared-types`; do not duplicate shared interfaces inside app folders to simplify Docker builds.
- Do not add provider-specific deployment behavior here; generic Kubernetes and deployment docs are later stories.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md#Story 8.2: Docker Images (Multi-Stage Builds)`]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-10: Deployment Targets`]
- [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#FRx08: Deployment, Database, & Testing Scripts`]
- [Source: `docs/project-context.md#Technology Stack & Versions`]
- [Source: `package.json`]
- [Source: `apps/web/package.json`]
- [Source: `apps/bff/package.json`]
- [Source: `apps/web/next.config.js`]
- [Source: `apps/bff/src/index.ts`]
- [Source: `apps/bff/src/lib/prisma.ts`]
- [Source: `apps/web/prisma/schema.prisma`]
- [Source: Docker Docs Multi-stage builds, https://docs.docker.com/build/building/multi-stage/]
- [Source: Docker Docs Building best practices, https://docs.docker.com/build/building/best-practices/]
- [Source: Docker Docs Next.js guide, https://docs.docker.com/guides/nextjs/]
- [Source: Next.js output config, https://nextjs.org/docs/app/api-reference/config/next-config-js/output]
- [Source: Prisma Docker guide, https://www.prisma.io/docs/guides/deployment/docker]

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

- 2026-08-08: Added failing Docker asset test first; initial run failed for missing `.dockerignore`, Dockerfiles, standalone output, and fragile BFF Prisma import.
- 2026-08-08: `npm.cmd run test:unit --workspace=apps/bff -- docker-images.unit.test.ts` passed after implementation.
- 2026-08-08: `npm.cmd run type-check` passed.
- 2026-08-08: `npm.cmd run build --workspace=packages/shared-types` passed.
- 2026-08-08: `npm.cmd run build --workspace=apps/bff` passed.
- 2026-08-08: `npm.cmd run build --workspace=apps/web` requires `NODE_ENV=production` in this shell; passed with `$env:NODE_ENV='production'`.
- 2026-08-08: `wsl -e sh -lc "cd /mnt/c/workspace/AI/ai_saas_monorepo && docker build -f apps/web/Dockerfile -t saas-web:8-2 ."` passed.
- 2026-08-08: `wsl -e sh -lc "cd /mnt/c/workspace/AI/ai_saas_monorepo && docker build -f apps/bff/Dockerfile -t saas-bff:8-2 ."` passed.
- 2026-08-08: `docker image inspect saas-web:8-2 saas-bff:8-2 --format '{{index .RepoTags 0}} {{.Size}}'` returned `saas-web:8-2 392208868` and `saas-bff:8-2 292081389`.
- 2026-08-08: BFF container `/health` returned `{"status":"healthy","service":"bff","timestamp":"2026-08-08T16:27:05.033Z"}`.
- 2026-08-08: Web container responded HTTP 200 on `/login` through a dynamic host port mapped from container port 3000.
- 2026-08-08: `npm.cmd run test` passed after final Dockerfile/test changes.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Created root `.dockerignore` for repository-root Docker contexts, excluding dependencies, generated outputs, reports, local env files, VCS metadata, and agent/runtime folders while preserving source/manifests needed by Docker builds.
- Updated `apps/web/next.config.js` with standalone output and monorepo tracing root while preserving strict mode and shared package transpilation.
- Added a multi-stage web image using `node:24-bookworm-slim`, root `npm ci`, Prisma generation, Next standalone runtime output, static/public assets, production env defaults, and non-root `nextjs` runtime user.
- Added a multi-stage BFF image using `node:24-alpine` after proving runtime behavior and size. The image builds shared-types, generates Prisma Client, compiles BFF JavaScript, installs focused production dependencies, copies generated Prisma artifacts, runs as non-root `nodejs`, and starts with `node dist/index.js`.
- Changed BFF Prisma singleton import to `@prisma/client`, preserving `load-env`, lazy global singleton behavior, and error/warn logging.
- Added Docker asset unit coverage in `apps/bff/src/tests/unit/docker-images.unit.test.ts`.
- Verification commands run: Docker builds for `saas-web:8-2` and `saas-bff:8-2`; image size inspect; BFF container `/health`; web container `/login`; `npm.cmd run type-check`; `npm.cmd run test`.
- Final image sizes: web `392208868` bytes (< 500 MB); BFF `292081389` bytes (< 300 MB).

### File List

- `.dockerignore`
- `apps/web/Dockerfile`
- `apps/web/next.config.js`
- `apps/bff/Dockerfile`
- `apps/bff/src/lib/prisma.ts`
- `apps/bff/src/tests/unit/docker-images.unit.test.ts`

### Change Log

- 2026-08-08: Implemented production multi-stage Docker images for web and BFF, standalone Next output, root Docker context hygiene, BFF Prisma import hardening, Docker asset tests, and full image/runtime verification.
