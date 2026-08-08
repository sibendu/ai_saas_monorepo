# Story 8.7: Deployment Documentation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want authoritative deployment documentation for local Compose, Docker images, Kubernetes, database operations, smoke tests, and scaling,
so that I can deploy and operate the SaaS foundation without reverse-engineering scripts, manifests, or environment variables.

## Acceptance Criteria

1. Given a new operator opens the repository docs, when they read the deployment guidance, then `README.md` points to the canonical deployment guide and `DEPLOYMENT.md` contains the complete operator path for local Docker Compose, Docker image build/push, Kubernetes deployment, database migration/seed, backup/restore, smoke tests, and horizontal scaling.
2. Given an Epic 8 asset is not implemented yet, when the deployment guide mentions that flow, then it clearly labels the prerequisite story or missing file and does not present non-existent commands as already runnable.
3. Given Docker Compose support exists, when the operator follows the local deployment section, then the docs describe environment setup, `docker-compose up`, migrations, seed data, service health checks, log inspection, and shutdown/cleanup using the actual repository file names.
4. Given Dockerfiles exist for web and BFF, when the operator follows the image section, then the docs show root-context build commands, version tagging, registry login/tag/push examples, required runtime env vars, image-size checks, and a clear rule that secrets and `.env*` files must not be baked into images.
5. Given Kubernetes manifests exist under `k8s/`, when the operator follows the Kubernetes section, then the docs cover placeholder replacement, Secret and ConfigMap handling, `kubectl apply -f k8s/`, status checks, web-only external exposure, BFF `ClusterIP` private access, PostgreSQL internal/external options, TLS, and encrypted database storage requirements.
6. Given database lifecycle tasks are documented, when the operator follows those sections, then migration, seed, backup, and restore commands map to actual scripts or npm scripts, identify required environment variables, and include verification steps that prove the database is usable after each operation.
7. Given post-deployment validation is documented, when the operator runs the documented smoke-test command, then it validates BFF `/health`, web `/login`, authenticated access where available, BFF-to-database connectivity, and exits non-zero on failure.
8. Given the guide describes production operation, when it discusses scaling, rollback, and troubleshooting, then it preserves the architecture guardrails: web and BFF are stateless, web and BFF scale independently, `NEXTAUTH_SECRET` is consistent across web replicas, BFF is not publicly routable, CORS is restricted to `WEB_APP_URL`, and PostgreSQL connection pooling/backups/encryption are operator responsibilities.
9. Given the guide includes examples or snippets, when reviewed, then they use current repository commands and current service ports: web `3000`, BFF `3001`, PostgreSQL `5432`, root npm workspaces, `npm run db:deploy`, `npm run db:seed`, and `npm run type-check`.
10. Given documentation changes are complete, when validation runs, then Markdown structure is coherent, stale or misleading deployment snippets are removed or marked obsolete, links to referenced files resolve, and `git diff --check` passes.

## Tasks / Subtasks

- [ ] Audit current deployment assets before editing docs. (AC: 1, 2, 9)
  - [ ] Check for `docker-compose.yml`, `.dockerignore`, `apps/web/Dockerfile`, `apps/bff/Dockerfile`, `k8s/`, backup/restore scripts, and smoke-test scripts.
  - [ ] Check root and workspace package scripts for build, migration, seed, smoke-test, and type-check commands.
  - [ ] Read `DEPLOYMENT.md`, `README.md`, `apps/web/.env.local.example`, and `apps/bff/.env.example` before changing any text.
  - [ ] Record any missing prerequisite artifacts in the guide rather than inventing working commands.
- [ ] Update `DEPLOYMENT.md` into the canonical deployment guide. (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [ ] Add or reorganize sections for prerequisites, environment variables, Docker Compose, Docker image build/push, Kubernetes, database migration/seed, backup/restore, smoke tests, scaling, rollback, security, and troubleshooting.
  - [ ] Preserve the existing "Database Encryption At Rest" guidance from Story 7.2 and link it from Kubernetes/database sections where relevant.
  - [ ] Replace stale inline Dockerfile snippets with references to actual Dockerfiles once Story 8.2 artifacts exist.
  - [ ] Replace generic Kubernetes snippets with references to `k8s/` manifests once Story 8.3 artifacts exist.
  - [ ] Keep BFF documented as private/internal only; do not add public BFF exposure examples.
- [ ] Add a concise `README.md` pointer to the canonical deployment guide. (AC: 1, 10)
  - [ ] Avoid duplicating deployment instructions in `README.md`.
  - [ ] Preserve unrelated user edits already present in `README.md`.
  - [ ] Link to `DEPLOYMENT.md` and any focused docs that already exist, such as `docs/theme-customization.md`.
- [ ] Document local Docker Compose operation. (AC: 2, 3, 9)
  - [ ] Include env setup and required `.env` files.
  - [ ] Include `docker-compose up`/`down` commands only if `docker-compose.yml` exists by implementation time.
  - [ ] Include migration and seed order, using `npm run db:deploy` and `npm run db:seed` or the Compose-specific command that actually exists.
  - [ ] Include health checks for `http://localhost:3000/login` and `http://localhost:3001/health`.
- [ ] Document Docker image build and registry push. (AC: 2, 4, 9)
  - [ ] Include root-context build commands for `apps/web/Dockerfile` and `apps/bff/Dockerfile`.
  - [ ] Include registry tag and push examples with replaceable placeholders.
  - [ ] Include image-size check commands and the Epic 8 thresholds: web under `500MB`, BFF under `300MB`.
  - [ ] State that real secrets, `.env*`, local `node_modules`, reports, coverage, and git metadata must not be included in build context or image layers.
- [ ] Document Kubernetes deployment and verification. (AC: 2, 5, 8, 9)
  - [ ] Include image placeholder replacement before apply.
  - [ ] Include Secret/ConfigMap replacement and a warning that committed placeholder Secret values are not production secret management.
  - [ ] Include `kubectl apply -f k8s/`, pod/service/ingress checks, BFF port-forward health verification, web login verification, and database connectivity verification.
  - [ ] State that only web is externally exposed and BFF remains `ClusterIP`.
  - [ ] Include external PostgreSQL guidance for production and in-cluster PostgreSQL caveats for demos.
- [ ] Document database operations. (AC: 2, 6, 8, 9)
  - [ ] Document migrations with `npm run db:deploy`.
  - [ ] Document Prisma client generation with `npm run db:generate` when needed for local development/builds.
  - [ ] Document seeding with `npm run db:seed`, including required `DATABASE_URL`.
  - [ ] Document backup/restore scripts only if Story 8.4 artifacts exist; otherwise add an explicit prerequisite/gap note.
  - [ ] Include restore verification checks, such as migration status, seed user lookup, or application health checks.
- [ ] Document smoke tests. (AC: 2, 7, 9)
  - [ ] Use the actual Story 8.6 command if implemented, expected to be `npm run test:smoke`.
  - [ ] If no smoke-test command exists, mark Story 8.6 as a prerequisite and do not claim smoke tests can already run.
  - [ ] Document required base URLs and credentials for deployed-environment smoke tests.
- [ ] Validate documentation quality. (AC: 10)
  - [ ] Run `git diff --check`.
  - [ ] Manually verify Markdown headings, fenced code blocks, and internal links.
  - [ ] Run `npm run type-check` only if TypeScript/config files are changed.
  - [ ] Run Kubernetes or Docker validation commands only for assets that exist and were changed.

## Dev Notes

### Epic and Business Context

- Epic 8 provides deployment, database, and testing scripts so the foundation is deployable to Docker Compose and Kubernetes. Story 8.7 is the operator-facing documentation story that ties the previous Epic 8 outputs together. [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md#Epic 8: Deployment, Database & Testing Scripts`]
- PRD FR.08.07 requires documentation for Docker image build/push, Kubernetes deploy, seed database, backup/restore, smoke tests, and horizontal scaling. [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#FRx08: Deployment, Database, & Testing Scripts`]
- This story should produce operator documentation, not deployment code. If implementation finds missing Docker, Kubernetes, backup/restore, or smoke-test assets, document the prerequisite and avoid silently creating broad infrastructure in this story unless the user explicitly expands scope.

### Current Repository State

- Primary UPDATE target: `DEPLOYMENT.md`.
- Secondary UPDATE target: `README.md`, only for a concise pointer to `DEPLOYMENT.md`.
- Current `DEPLOYMENT.md` already contains deployment options, environment variables, Kubernetes snippets, security checklist, scaling notes, rollback, troubleshooting, and the Story 7.2 "Database Encryption At Rest" section. Preserve the encryption-at-rest content.
- Current `README.md` already contains local database setup, development commands, test/build commands, theme customization link, and a broad deployment strategy. It is modified in the working tree at story creation time; preserve unrelated edits.
- At story creation time, these paths were not present: `docker-compose.yml`, `.dockerignore`, `apps/web/Dockerfile`, `apps/bff/Dockerfile`, `k8s/`, root `scripts/`, and `tests/smoke/`.
- At story creation time, env examples existed at `apps/web/.env.local.example` and `apps/bff/.env.example`.
- Root package scripts currently include `build`, `build:web`, `build:bff`, `type-check`, `db:validate`, `db:generate`, `db:migrate`, `db:deploy`, `db:status`, `db:studio`, and `db:seed`. There is no root `test:smoke` script at story creation time. [Source: `package.json`]
- Web runs on port `3000`, BFF runs on port `3001`, and BFF `/health` returns healthy JSON from `apps/bff/src/index.ts`. [Source: `apps/bff/src/index.ts`; `docs/project-context.md#Technology Stack & Versions`]

### Previous Story Intelligence

- Story 8.2 has already created a ready-for-dev story for multi-stage Docker images, but the repository did not contain the Dockerfiles at story-creation time for 8.7. Do not write image documentation that assumes Story 8.2 is implemented unless the files exist by implementation time. [Source: `_bmad-output/implementation-artifacts/8-2-docker-images-multi-stage-builds.md`]
- Story 8.3 has already created a ready-for-dev story for generic Kubernetes manifests, but the repository did not contain `k8s/` at story-creation time for 8.7. Do not replace this with partial manifests inside documentation; link to `k8s/` only when it exists. [Source: `_bmad-output/implementation-artifacts/8-3-kubernetes-manifests-generic.md`]
- Story 7.2 implemented database encryption-at-rest guidance in `DEPLOYMENT.md` and moved to review. Preserve that section and cross-link it from database and Kubernetes deployment guidance. [Source: `_bmad-output/implementation-artifacts/7-2-encryption-at-rest-database-level.md`; `DEPLOYMENT.md#Database Encryption At Rest`]
- Sprint status at story creation: `8-1-docker-compose-setup-local-dev` is `in-progress`, `8-2` and `8-3` are `ready-for-dev`, `8-4-database-backup-restore-scripts` is `backlog`, `8-5-seed-data-script` is `in-progress`, `8-6-smoke-tests-post-deployment-validation` is `backlog`, and `8-7` is `backlog`. Treat incomplete dependencies as documentation prerequisites, not completed capabilities. [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml`]

### Architecture Guardrails

- Web and BFF are separate deployable services in an npm workspace monorepo. Do not document a single combined app container or a process manager that runs both services in one deployment unit. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-01: Monorepo BFF Paradigm`]
- Web app owns auth and presentation; BFF owns business logic and data access. The deployment guide should not move auth into BFF. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-02: Authentication Model`]
- BFF is private and not publicly routable. In Kubernetes this means `ClusterIP` only and no BFF Ingress, public `LoadBalancer`, or `NodePort`. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-04: BFF as Private Service`]
- Sessions are JWT-only and stateless. Scaling docs must call out consistent `NEXTAUTH_SECRET` across web replicas and no Redis requirement for Phase 1 session storage. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-03: Session Storage Strategy`]
- Deployment targets are Docker Compose for local development and generic Kubernetes manifests for production/demo portability. Avoid provider-specific baseline requirements. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-10: Deployment Targets`]
- Production security guidance must preserve TLS, Helmet, CORS restriction, no sensitive logs, and database encryption at rest. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-11: Security & Encryption`]
- Request timeout and database pooling defaults are locked: HTTP socket timeout 30s, request timeout 60s, keep-alive timeout 65s, PostgreSQL pool size 10, query timeout 30s, idle timeout 30s. Mention these where deployment configuration affects operations. [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/addendum.md#BFF Request Timeout & Connection Pooling`]

### Documentation Implementation Rules

- Prefer a single canonical `DEPLOYMENT.md` over scattering full deployment instructions across `README.md`, `k8s/README.md`, and comments. A focused `k8s/README.md` from Story 8.3 can remain manifest-specific, but `DEPLOYMENT.md` should be the operator entry point.
- Do not duplicate long code snippets from Dockerfiles or Kubernetes manifests when a real file exists. Link to the file and show the command that uses it.
- Examples must use replaceable placeholders for registries, hosts, namespaces, secrets, and credentials. Never include real credentials.
- Do not document `NEXT_PUBLIC_BFF_URL` as the preferred production Kubernetes path for private BFF calls. Prefer `BFF_INTERNAL_URL` for server-side web-to-BFF communication because `NEXT_PUBLIC_*` values can reach browser bundles.
- Keep deployment documentation current with actual repo commands. Do not keep the stale `node:18-alpine` inline BFF Dockerfile as authoritative if Story 8.2 creates current Dockerfiles.
- Avoid claiming production readiness from documentation alone. The guide should identify verification commands and evidence the operator must collect.

### Latest Technical Information

- Docker recommends multi-stage builds and small final images that contain only runtime artifacts; `.dockerignore` should keep unnecessary context out of builds. Sources: <https://docs.docker.com/build/building/best-practices/> and <https://docs.docker.com/build/concepts/context/>
- Docker multi-stage builds support named stages and copying selected artifacts from earlier stages, which is the expected pattern for web and BFF image docs. Source: <https://docs.docker.com/build/building/multi-stage/>
- Next.js self-hosted Docker deployments should use `output: "standalone"` when the Dockerfile relies on standalone output for a minimal production image. Source: <https://nextjs.org/docs/app/getting-started/deploying>
- Prisma Docker deployments must ensure Prisma Client is generated inside the build/runtime environment before application code imports it. Source: <https://www.prisma.io/docs/guides/deployment/docker>
- Kubernetes `Ingress` exposes Services externally and requires an ingress controller; use it for web-only external traffic, not BFF. Source: <https://kubernetes.io/docs/concepts/services-networking/ingress/>
- Kubernetes `Secret` stores sensitive API objects, while `ConfigMap` is for non-confidential configuration. Production docs should still recommend real secret-management and Kubernetes Secret encryption where applicable. Sources: <https://kubernetes.io/docs/concepts/configuration/secret/> and <https://kubernetes.io/docs/concepts/configuration/configmap/>

### Git Intelligence Summary

- Recent commits are admin/UI oriented, not deployment oriented:
  - `352a315 fix: handle non-json admin api responses`
  - `29b9d0b feat: add admin audit trail logging`
  - `19782dc merge: complete admin role module mapping`
  - `c0d11e8 feat: complete admin role module mapping`
  - `aeeaf45 feat: add admin module management tab`
- Do not infer deployment conventions from recent commits. Use architecture artifacts, package scripts, existing docs, and actual deployment files found at implementation time.
- The working tree already contains unrelated modified and untracked files at story creation time. Preserve user changes and do not clean generated reports or unrelated artifacts for this story.

### Testing Requirements

- Documentation-only implementation:
  - Run `git diff --check`.
  - Manually verify headings, fenced code blocks, and internal links.
  - Check that every command in `DEPLOYMENT.md` maps either to an existing file/script or is clearly labeled as a prerequisite/gap.
- If only Markdown changes are made, `npm run type-check` is not required, but it can be run if the implementation touches TypeScript/config.
- If Kubernetes manifests are created or changed by another story before implementation, validate documented commands against `kubectl apply --dry-run=client -f k8s/` when `kubectl` is available.
- If Dockerfiles are present and documentation examples are updated, verify documented build commands are syntactically correct and record any live build commands actually run.
- If smoke-test scripts are present, run the documented smoke-test command or record the exact environment dependency that prevented execution.

### Project Structure Notes

- Update target: `DEPLOYMENT.md`.
- Narrow pointer target: `README.md`.
- Reference env files: `apps/web/.env.local.example`, `apps/bff/.env.example`.
- Reference package scripts: `package.json`, `apps/web/package.json`, `apps/bff/package.json`.
- Conditional reference targets if present during implementation: `docker-compose.yml`, `.dockerignore`, `apps/web/Dockerfile`, `apps/bff/Dockerfile`, `k8s/`, `scripts/backup.sh`, `scripts/restore.sh`, and smoke-test files.
- Do not edit generated reports, `node_modules`, build outputs, coverage, or agent-runtime folders.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md#Story 8.7: Deployment Documentation`]
- [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#FRx08: Deployment, Database, & Testing Scripts`]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-10: Deployment Targets`]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-04: BFF as Private Service`]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-11: Security & Encryption`]
- [Source: `docs/project-context.md#Environment Variables`]
- [Source: `README.md#Deployment Strategy`]
- [Source: `DEPLOYMENT.md`]
- [Source: `package.json`]
- [Source: `apps/web/.env.local.example`]
- [Source: `apps/bff/.env.example`]
- [Source: Docker Build best practices, <https://docs.docker.com/build/building/best-practices/>]
- [Source: Docker Build context, <https://docs.docker.com/build/concepts/context/>]
- [Source: Docker Multi-stage builds, <https://docs.docker.com/build/building/multi-stage/>]
- [Source: Next.js Deploying, <https://nextjs.org/docs/app/getting-started/deploying>]
- [Source: Prisma Docker guide, <https://www.prisma.io/docs/guides/deployment/docker>]
- [Source: Kubernetes Ingress, <https://kubernetes.io/docs/concepts/services-networking/ingress/>]
- [Source: Kubernetes Secrets, <https://kubernetes.io/docs/concepts/configuration/secret/>]
- [Source: Kubernetes ConfigMaps, <https://kubernetes.io/docs/concepts/configuration/configmap/>]

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

- Workflow customization resolved with `_bmad/scripts/resolve_customization.py`; no activation steps and one persistent project-context fact were loaded.
- Discovery loaded PRD, PRD addendum, architecture spine, architecture discussion, epics/stories, project context, sprint status, existing `DEPLOYMENT.md`, `README.md`, package manifests, env examples, and prior story files 8.2, 8.3, and 7.2.
- Web research used official Docker, Next.js, Prisma, and Kubernetes documentation on 2026-08-08.
- Target asset checks at story creation returned missing for `docker-compose.yml`, `.dockerignore`, `apps/web/Dockerfile`, `apps/bff/Dockerfile`, `k8s/`, root `scripts/`, and `tests/smoke/`; env examples existed.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story status set to ready-for-dev.

### File List

- `_bmad-output/implementation-artifacts/8-7-deployment-documentation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
