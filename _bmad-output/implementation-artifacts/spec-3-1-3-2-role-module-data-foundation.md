---
title: 'Stories 3.1 and 3.2: role/module data foundation'
type: 'feature'
created: '2026-07-12'
status: 'done'
review_loop_iteration: 0
context:
  - '{project-root}/docs/project-context.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** Epic 3 needs persisted role, module, sub-module, and mapping data before server-side menu filtering can be implemented. The current Prisma schema only contains customers and tasks, so there is no type-safe place to store menu access rules or seed validation data.

**Approach:** Add Prisma models, a forward SQL migration, shared TypeScript interfaces, and an idempotent Prisma seed script for sample roles, modules, sub-modules, mappings, and role-assigned users.

## Boundaries & Constraints

**Always:** Preserve existing Customer and Task behavior; use forward-only migration history; keep PostgreSQL table names snake_case via `@map`/`@@map`; make seed data repeatable without duplicate rows.

**Ask First:** Resetting the database, rewriting existing migrations, changing authentication/session behavior, or implementing Story 3.3/3.4 server-side role filtering.

**Never:** Store real credentials, delete user data, rely on hardcoded database URLs, or touch unrelated dirty app page changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh schema | Migrations applied to an empty PostgreSQL database | Role/menu tables exist with correct relations and generated Prisma types | Migration fails clearly if database is unavailable |
| Repeat seed | Seed script runs after data already exists | Existing roles/modules/users are updated or reused without duplicate business records | Script disconnects Prisma and exits non-zero on unexpected errors |
| Role access mapping | Sales role seed data | Sales has CRM and Reporting access with configured sub-modules | Missing module/sub-module lookup throws during seed instead of silently skipping |

</frozen-after-approval>

## Code Map

- `apps/web/prisma/schema.prisma` -- canonical Prisma models and relationships.
- `apps/web/prisma/migrations/20260712000000_add_role_module_menu_schema/migration.sql` -- forward database migration.
- `apps/web/prisma/seed.js` -- idempotent sample data seed for Story 3.2.
- `apps/web/package.json` -- Prisma seed command registration.
- `package.json` -- root `db:seed` command.
- `packages/shared-types/src/index.ts` -- exported role/module/menu interfaces.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/prisma/schema.prisma` -- add Role, Module, SubModule, RoleModule, UserRole and customer relations.
- [x] `apps/web/prisma/migrations/20260712000000_add_role_module_menu_schema/migration.sql` -- create matching tables, foreign keys, and indexes.
- [x] `apps/web/prisma/seed.js` -- seed Admin, User, Sales, Marketing roles; CRM, Reporting, Settings, Dashboard modules; sample sub-modules; role-module mappings; and test users with roles.
- [x] `package.json`, `apps/web/package.json` -- expose `npm run db:seed` and Prisma seed metadata.
- [x] `packages/shared-types/src/index.ts` -- export Role, Module, SubModule, RoleModule, and UserRole types.

**Acceptance Criteria:**
- Given the schema is validated, when `npm run db:validate` runs, then Prisma accepts all models and relations.
- Given the client is generated, when TypeScript imports shared role/menu types, then they compile without implicit `any`.
- Given seed data already exists, when `npm run db:seed` runs again, then roles, modules, mappings, and seeded users are reused or updated without duplicate named records.

## Spec Change Log

## Design Notes

`RoleModule.subModuleId` is nullable so a grant can apply to a whole module or one sub-module. The table uses a surrogate `id` because nullable fields are not suitable for a composite primary key in PostgreSQL.

## Verification

**Commands:**
- `npm run db:validate` -- Prisma schema validates.
- `npm run db:generate` -- Prisma client generation succeeds.
- `npm run db:migrate` -- migration applied successfully; DB verified manually.
- `npm run type-check` -- all workspaces compile.
