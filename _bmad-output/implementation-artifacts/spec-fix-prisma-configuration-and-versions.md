---
title: 'Fix Prisma configuration and version mismatches'
type: 'chore'
created: '2026-07-11'
status: 'draft'
review_loop_iteration: 0
context:
  - '{project-root}/docs/project-context.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** Prisma is installed at incompatible versions across the monorepo. The web workspace has an invalid config, lacks `DATABASE_URL` guidance, and its migration history omits password-reset columns used by the schema and runtime. README commands are contradictory and not reproducible.

**Approach:** Standardize Prisma in `apps/web` on exact version `6.19.2`, add a valid workspace config and root command surface, complete migration history without rewriting it, and document one tested PostgreSQL setup workflow.

## Boundaries & Constraints

**Always:** Preserve unrelated user edits, including current BFF URL changes; keep PostgreSQL, `prisma-client-js`, and environment-driven credentials; use `migrate dev` only locally and `migrate deploy` for deployment; add forward migrations instead of editing existing ones.

**Ask First:** Resetting a database, deleting or squashing migrations, changing models beyond migration reconciliation, or upgrading to Prisma 7.

**Never:** Embed real credentials, retain duplicate Prisma installations, use a fallback connection string, or alter unrelated application behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Behavior | Error Handling |
|----------|---------------|-------------------|----------------|
| Clean install | Root lockfile | CLI/client resolve to `6.19.2`; no adapter remains | Dependency check fails on any mismatch |
| Local workflow | `apps/web/.env` has `DATABASE_URL` | Root scripts validate, generate, inspect, and migrate | Missing URL fails clearly; no fallback DB |
| Deployment | Committed migrations and production URL | Deploy applies pending migrations only | Never creates migrations or resets data |
| Fresh database | All migrations run in order | Database matches current schema | Reconciliation is forward-only |

</frozen-after-approval>

## Code Map

- `package.json` -- root scripts and conflicting Prisma 7 dependencies.
- `package-lock.json` -- resolved dependency graph.
- `apps/web/package.json` -- Prisma owner; currently mixes client 6.19.2 and adapter 7.3.0.
- `apps/web/prisma.config.ts` -- new canonical CLI configuration.
- `apps/web/prisma/prisma.config.ts` -- invalid nested config to remove.
- `apps/web/prisma/schema.prisma` -- canonical PostgreSQL schema.
- `apps/web/prisma/migrations/` -- immutable history requiring a forward migration.
- `apps/web/.env.local.example` -- environment template; preserve current URL edits.
- `apps/web/src/lib/prisma.ts` -- classic Prisma 6 client with no adapter.
- `README.md` -- final setup and operations guide.

## Tasks & Acceptance

**Execution:**
- [ ] `package.json`, `apps/web/package.json` -- remove root Prisma 7 and unused adapter, pin web CLI/client 6.19.2, and add root database scripts.
- [ ] Prisma config files -- replace the invalid nested config with a workspace-root Prisma 6 config for schema and migration paths, without credentials.
- [ ] `apps/web/.env.local.example` -- add a safe local `DATABASE_URL` placeholder while preserving unrelated values.
- [ ] `apps/web/prisma/migrations/<timestamp>_add_password_reset_fields/migration.sql` -- add missing nullable password-reset columns.
- [ ] `package-lock.json` -- regenerate and verify the Prisma dependency tree.
- [ ] `README.md` -- document installation, PostgreSQL/database creation, environment setup, development migrations, deployment, generation, status, and troubleshooting.

**Acceptance Criteria:**
- Given a clean install, when the Prisma dependency tree is listed, then CLI/client are 6.19.2 and no adapter or Prisma 7 package remains.
- Given a placeholder PostgreSQL URL, when validation and generation run, then Prisma loads the workspace config and both commands succeed.
- Given all committed migrations, when compared with the schema, then every persisted field has a forward migration.
- Given a new developer follows README, when setup commands run from the repository root, then migrations deploy and the client generates without ambiguous `npx prisma` resolution.

## Spec Change Log

## Design Notes

Stay on 6.19.2 because it is the project invariant and runtime architecture. Prisma 7 would require broader Node, TypeScript, ESM, schema, and client-construction changes. Config paths resolve from `apps/web/prisma.config.ts`.

## Verification

**Commands:**
- `npm install` -- manifests, lockfile, and installed dependencies agree.
- `npm ls prisma @prisma/client @prisma/adapter-pg --all` -- only compatible Prisma 6.19.2 entries remain.
- `npm run db:validate` -- config loads and schema validates with a placeholder URL.
- `npm run db:generate` -- client generation succeeds.
- `npm run type-check` -- all workspaces compile.
- `npm run build` -- monorepo build succeeds.

