---
baseline_commit: 22d3398618586faa2c7f7b9f95a66e4c10f241c2
---

# Story 7.2: Encryption At-Rest (Database Level)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a security-conscious SaaS operator,
I want database data to be protected with documented encryption-at-rest controls,
so that production deployments reduce exposure from database storage, backups, snapshots, and infrastructure compromise.

## Acceptance Criteria

1. The chosen PostgreSQL at-rest encryption approach is documented in the deployment guide, including when to use provider-managed storage encryption, encrypted Kubernetes persistent volumes, or pgcrypto column encryption.
2. Production deployment guidance includes database storage encryption setup for managed database deployments and Kubernetes/self-hosted PostgreSQL deployments.
3. The documentation explicitly verifies that password values are bcrypt hashes and reset/activation tokens are SHA-256 hashes before storage, and it does not instruct developers to decrypt or reverse those values.
4. The Kubernetes deployment guidance distinguishes Kubernetes Secret API encryption from PersistentVolume/database file encryption and requires encrypted storage for the PostgreSQL data volume.
5. The implementation avoids schema churn unless a concrete plaintext sensitive column is introduced; existing searchable/profile fields remain unchanged unless the chosen approach explicitly requires column-level encryption.
6. Documentation includes an operator verification checklist for at-rest encryption coverage across primary database storage, backups, snapshots, read replicas, and local/non-production environments.
7. No new production guidance stores encryption keys in the database, application source, Docker image layers, or plaintext manifests.

## Tasks / Subtasks

- [x] Task 1: Document the selected encryption-at-rest strategy in `DEPLOYMENT.md` (AC: 1, 2, 6, 7)
  - [x] Add a "Database Encryption At Rest" section near the production security checklist.
  - [x] State the Phase 1 default: use infrastructure/provider-managed encryption for database storage, backups, snapshots, and replicas.
  - [x] Document pgcrypto as a future column-level option only for fields that must remain confidential from storage/admin reads, not as the default for passwords or reset tokens.
  - [x] Include clear local development guidance: local Postgres is not production encryption unless the host disk or Postgres data directory volume is encrypted.

- [x] Task 2: Update Kubernetes/deployment-manifest guidance for PostgreSQL storage encryption (AC: 2, 4, 6, 7)
  - [x] If a `k8s/` directory exists when implementing, update the PostgreSQL StorageClass/PVC/StatefulSet/Deployment files there.
  - [x] If `k8s/` still does not exist, update the Kubernetes example snippets in `DEPLOYMENT.md` instead and do not create a partial generic K8s stack that overlaps Story 8.3.
  - [x] Require an encrypted storage class or provider-managed encrypted disk for the PostgreSQL data volume.
  - [x] Add a note that Kubernetes Secret encryption protects API objects in etcd, not the mounted PostgreSQL data files.

- [x] Task 3: Document managed database requirements (AC: 1, 2, 6, 7)
  - [x] For AWS RDS PostgreSQL guidance, require RDS encryption at rest with KMS and note that storage, automated backups, read replicas, logs, and snapshots are covered by RDS encryption.
  - [x] For Azure Database for PostgreSQL guidance, note service-managed keys are the default and customer-managed keys are available when required.
  - [x] Keep provider details concise and link to official docs instead of embedding long setup procedures.

- [x] Task 4: Verify current sensitive-data storage behavior in docs (AC: 3, 5)
  - [x] Reference `apps/web/src/lib/password-reset.ts`: generated reset/activation tokens are stored only as SHA-256 hashes.
  - [x] Reference `apps/web/src/app/api/auth/reset-password/route.ts`: new passwords are stored with bcrypt.
  - [x] Reference `apps/web/prisma/seed.js`: seeded user passwords are bcrypt-hashed.
  - [x] Reference `apps/web/prisma/schema.prisma`: `Customer.password` and `Customer.passwordResetToken` store non-plaintext values; do not migrate these to decryptable pgcrypto columns.

- [x] Task 5: Add validation evidence and operator checks (AC: 3, 6, 7)
  - [x] Add a checklist item requiring production DB encryption status evidence from the provider/cluster before launch.
  - [x] Add checks for encrypted backups/snapshots/read replicas.
  - [x] Add checks that encryption keys are stored in KMS/Key Vault/Secret Manager or storage-provider key management, not in source-controlled files.
  - [x] Add a reminder that raw reset/activation links logged when email env vars are missing must not be used as a production email configuration.

## Dev Notes

### Story Scope

This story is a security/deployment documentation and manifest-guidance story. It should not introduce broad application encryption code unless the implementer first identifies a plaintext sensitive field that requires application-managed column encryption.

The current project has `DEPLOYMENT.md` with deployment options, Kubernetes snippets, environment variables, and a production security checklist. There is no checked-in `k8s/` directory at story-creation time. The minimum correct implementation in the current repo is therefore to update `DEPLOYMENT.md` with production-grade encryption-at-rest guidance and manifest snippets. If later stories create real Kubernetes manifests before this story is implemented, update those files too.

### Architecture Compliance

- Follow AD-11: security requires encryption in transit and database encryption at rest at PostgreSQL level through pgcrypto or full-disk/infrastructure encryption. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-11-Security--Encryption-LOCKED`]
- Preserve AD-10 deployment boundaries: Docker Compose is local development; Kubernetes manifests should remain generic and provider-agnostic. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-10-Deployment-Targets-LOCKED`]
- Preserve the BFF private-service model and do not make the BFF public while documenting database encryption. [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-04-BFF-as-Private-Service-ADOPTED`]
- Do not add client-side storage for secrets. Existing auth/session design uses NextAuth JWT sessions in HttpOnly cookies. [Source: `docs/project-context.md#NextAuth-Integration`]

### Current File State To Preserve

- `DEPLOYMENT.md` currently contains Vercel/ECS, AWS Amplify/ECS, and Kubernetes examples plus a production security checklist. This is the primary UPDATE target.
- `README.md` contains local database setup and the broad deployment strategy. Update only if a short pointer to `DEPLOYMENT.md` is useful; avoid duplicating the full encryption guidance.
- `apps/web/prisma/schema.prisma` currently stores `Customer.password` and `Customer.passwordResetToken` as strings. These values are already intended to contain hashes, not plaintext. Avoid Prisma migrations unless column-level encryption is explicitly chosen for a new or existing plaintext sensitive column.
- `apps/web/src/lib/password-reset.ts` creates a raw token for email links and stores a SHA-256 hash of that token. Preserve this one-way-token pattern.
- `apps/web/src/app/api/auth/reset-password/route.ts` hashes passwords with bcrypt before storing them.
- `apps/web/prisma/seed.js` hashes seeded passwords with bcrypt before creating users.

### Selected Technical Direction

Use provider-managed or storage-layer encryption as the Phase 1 default:

- Managed PostgreSQL: require encryption at rest on the database service using provider-managed or customer-managed keys, with coverage for storage, backups, snapshots, replicas, and logs where supported.
- Kubernetes/self-hosted PostgreSQL: require encrypted PersistentVolume storage or an encrypted node/disk layer for the Postgres data directory. Kubernetes Secret API encryption is separate and does not encrypt mounted database files.
- pgcrypto: document as an optional column-level mechanism for future plaintext sensitive fields. Do not use pgcrypto for passwords or reset tokens because they should remain one-way hashes, not decryptable ciphertext.

### Latest Technical Information

- PostgreSQL 18.4 is the current official documentation version found during story creation on 2026-07-18. PostgreSQL pgcrypto provides cryptographic functions and is a trusted extension installable by users with `CREATE` privilege, but it requires OpenSSL support in the PostgreSQL build. Source: https://www.postgresql.org/docs/current/pgcrypto.html
- PostgreSQL official docs describe multiple encryption options and note that PostgreSQL offers encryption at several levels. Source: https://www.postgresql.org/docs/current/encryption-options.html
- Kubernetes official docs state that Kubernetes API at-rest encryption protects API resources such as Secrets; mounted container filesystems require encrypted storage integration or application-level encryption. Source: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- AWS RDS official docs state RDS encryption at rest covers DB instance storage, logs, automated backups, read replicas, and snapshots using AES-256 on the host. Source: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- Azure Database for PostgreSQL official docs state service-managed-key encryption is the default mode and customer-managed keys are available. Source: https://learn.microsoft.com/en-us/azure/postgresql/security/security-data-encryption

### Implementation Guardrails

- Do not claim "PostgreSQL TDE is enabled" for community PostgreSQL unless a specific provider/product supports it. Prefer "provider-managed storage encryption" or "encrypted persistent volume".
- Do not store encryption passphrases in `DATABASE_URL`, Prisma schema, `.env.local.example`, Dockerfiles, Kubernetes plaintext ConfigMaps, or committed Secrets.
- If pgcrypto examples are added, they must show key material coming from an external secret manager/KMS integration placeholder, not a hardcoded literal.
- Keep documentation provider-agnostic first, then include concise AWS/Azure examples because the current `DEPLOYMENT.md` already references AWS and Kubernetes options.
- Avoid changing `apps/web/prisma/schema.prisma` for this story unless the implementation explicitly adds column-level encryption. If schema changes are made, run `npm run db:validate`, create a Prisma migration, and run `npm run db:generate`.
- Generated files such as `apps/web/tsconfig.tsbuildinfo` are not implementation targets and should not be edited.

### Testing Requirements

- Documentation-only path:
  - Run a Markdown/link sanity check manually by reviewing rendered headings and internal references.
  - Run `git diff --check` to catch whitespace issues.
- If Kubernetes YAML files are added or updated:
  - Run `kubectl apply --dry-run=client -f k8s/` when `kubectl` is available.
  - Confirm the PostgreSQL PVC references an encrypted StorageClass or provider-encrypted volume.
- If Prisma/schema/application code changes are made:
  - Run `npm run db:validate`.
  - Run `npm run type-check`.
  - Run focused tests for changed code, then `npm run test` if shared auth/database behavior is touched.

### Previous Story Intelligence

Sprint status shows Story 7.1 as `in-progress`, but no `7-1-*.md` implementation-artifact story file exists at story-creation time. Do not infer undocumented completion details from that missing file. Use the Epic 7 source content and current code/docs instead.

### Git Intelligence Summary

Recent commit titles indicate active admin/menu work and no obvious existing encryption-at-rest implementation:

- `22d3398 stories 4.1, 4.2 developed`
- `13647f5 fix: harden admin role management`
- `50710ef -`
- `1fb87b3 Story 3.5 - menu dispostion left|top`
- `18b094d feat: add config-driven top menu layout`

The working tree also contains unrelated changes outside this repository root and an untracked sibling `_bmad-ui/`; do not modify or revert them for this story.

### Project Structure Notes

- Primary target: `DEPLOYMENT.md`.
- Conditional targets if present during implementation: `k8s/*.yaml`, PostgreSQL StorageClass/PVC/StatefulSet/Deployment manifests.
- Reference-only files unless implementation scope expands: `apps/web/prisma/schema.prisma`, `apps/web/src/lib/password-reset.ts`, `apps/web/src/app/api/auth/reset-password/route.ts`, `apps/web/prisma/seed.js`, `README.md`.
- This story should remain infrastructure/security documentation focused. Do not add frontend UX, routes, components, or BFF endpoints.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md#Story-72-Encryption-At-Rest-Database-Level`]
- [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#FRx07-Security--Encryption`]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-11-Security--Encryption-LOCKED`]
- [Source: `DEPLOYMENT.md#Security-Checklist`]
- [Source: `docs/project-context.md#Prisma--Database`]
- [Source: `apps/web/prisma/schema.prisma#Customer`]
- [Source: `apps/web/src/lib/password-reset.ts`]
- [Source: `apps/web/src/app/api/auth/reset-password/route.ts`]
- [Source: `apps/web/prisma/seed.js`]

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

- `python3 .\_bmad\scripts\resolve_customization.py ...` failed because `python3` is not installed in this PowerShell environment; workflow customization was resolved by reading customization files directly.
- Discovery loaded PRD, architecture, epics, project context, sprint status, current deployment docs, Prisma schema, password reset helpers/routes, and seed script.
- Web research was performed against official PostgreSQL, Kubernetes, AWS, and Microsoft Azure documentation on 2026-07-18.
- `rg -n "Database Encryption At Rest|encrypted storage|pgcrypto|passwordResetToken|bcrypt|SHA-256|Kubernetes Secret" ...` confirmed the deployment doc initially lacked the story-required encryption-at-rest coverage while the referenced code used bcrypt/SHA-256 storage patterns.
- `Test-Path k8s` returned no checked-in `k8s/` directory, so Kubernetes storage encryption guidance was added to `DEPLOYMENT.md` snippets instead of creating Story 8.3 manifests early.
- `git diff --check` passed with Git line-ending warnings only.
- `npm run test` failed because PowerShell blocked `npm.ps1`; reran with `npm.cmd`.
- `npm.cmd run test` failed once because the BFF integration import attempted to listen on port 3001, which was already in use.
- `$env:NODE_ENV='test'; npm.cmd run test` passed: web unit 45 tests, BFF unit 6 tests, web integration 3 tests, BFF integration 6 tests.
- `npm.cmd run type-check` passed for BFF, web, and shared-types workspaces.
- `rg -n '^## |^### |^```' DEPLOYMENT.md` verified the new heading and fenced-code structure.

### Implementation Plan

- Keep the implementation documentation-only because no plaintext sensitive database column was introduced.
- Use provider-managed/storage-layer encryption as the Phase 1 default for managed PostgreSQL, Kubernetes/self-hosted storage, backups, snapshots, replicas, and logs.
- Document pgcrypto only as a future column-level option for decryptable confidential fields and keep keys outside source, manifests, images, and the database.
- Verify current password/reset-token behavior by referencing the existing bcrypt and SHA-256 code paths rather than changing Prisma schema.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story status set to ready-for-dev.
- Added `DEPLOYMENT.md` database encryption-at-rest guidance covering managed PostgreSQL, Kubernetes/self-hosted PostgreSQL, pgcrypto boundaries, local development, and operator verification.
- Documented that current passwords are bcrypt hashes and reset/activation tokens are SHA-256 hashes before storage; no Prisma schema or application encryption code changes were made.
- Added production launch checks for encryption evidence across primary storage, backups, snapshots, read replicas, logs, local/non-production environments, and key-management placement.
- Validated documentation structure, whitespace, tests, and type-check gates; the plain npm test command still needs the environment/port issue noted above addressed separately if the team wants it to pass without `NODE_ENV=test`.

### Change Log

- 2026-07-18: Implemented Story 7.2 encryption-at-rest deployment guidance and moved story to review.

### File List

- `DEPLOYMENT.md`
- `_bmad-output/implementation-artifacts/7-2-encryption-at-rest-database-level.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
