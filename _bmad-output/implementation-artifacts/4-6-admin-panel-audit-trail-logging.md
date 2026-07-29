---
baseline_commit: 6c78e9892880416dbe22b3b518d623db9c4ca4af
---

# Story 4.6: Admin Panel - Audit Trail Logging

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an admin,
I want all admin changes to be recorded in a database-backed audit trail and viewable from the admin panel,
so that access-control changes can be reviewed without inspecting console output or the database manually.

## Acceptance Criteria

1. Given a signed-in user with the `Admin` role, when any admin mutation succeeds, then an audit log row is persisted with timestamp, actor customer id/email, action, entity type, entity id, and safe structured metadata.
2. Given a signed-in user without the `Admin` role, when they call audit-log APIs or admin mutation APIs, then audit data is not exposed and no audit row is written for the denied request.
3. Given an admin creates, updates, or deletes a role, when the mutation commits, then an audit row records `ROLE_CREATED`, `ROLE_UPDATED`, or `ROLE_DELETED` with the affected role id/name and safe metadata.
4. Given an admin edits a user's profile fields, when the mutation commits, then an audit row records `USER_UPDATED` with the target customer id and changed field names only.
5. Given an admin assigns or removes user roles, when the mutation commits, then an audit row records `USER_ROLES_UPDATED` with target customer id and normalized role ids.
6. Given Story 4.5 role-module mapping endpoints exist, when an admin grants or revokes module access, then an audit row records `ROLE_MODULES_UPDATED` with target role id plus normalized module and sub-module ids.
7. Given an admin mutation validates input but fails before persistence, when the request returns a 4xx or 5xx response, then no success audit row is written for that failed mutation.
8. Given an audit write fails for a mutation that is expected to be audited, when possible the admin mutation is rolled back in the same Prisma transaction and the API returns `500 Failed to write audit log` or the route's existing generic 500 message without partially applying changes.
9. Given audit logs are stored, when an admin opens `/admin` and selects the Logs tab, then a read-only audit screen displays timestamp, actor, action, entity, and summary metadata without edit/delete controls.
10. Given many audit logs exist, when an admin uses the audit-log API, then results are sorted newest first and support pagination with a bounded `limit` of at most 100 rows.
11. Given an admin filters logs by action, entity type, actor email, target customer id, target role id, or date range, when valid query parameters are submitted, then the API returns only matching audit rows.
12. Given invalid filter parameters are submitted, when the audit-log API handles the request, then it returns `400` with a clear validation error and does not run an unbounded or malformed query.
13. Given audit metadata is stored or displayed, when logs are reviewed, then passwords, password reset tokens, session tokens, OAuth provider internals, raw request bodies, full customer records, and raw Prisma errors are never stored in `metadata` or rendered in the UI.
14. Given existing admin console logs exist, when this story is complete, then successful admin mutation routes use a shared audit helper and do not rely on console output as the audit trail.

## Tasks / Subtasks

- [ ] Add database audit schema and migration (AC: 1, 3-6, 9-13)
  - [ ] Add Prisma enums `AdminAuditAction` and `AdminAuditEntityType` to `apps/web/prisma/schema.prisma`.
  - [ ] Add `AuditLog` model mapped to `audit_log`.
  - [ ] Include fields: `id`, `actorCustomerId`, `actorEmail`, `action`, `entityType`, `entityId`, `entityLabel`, `targetCustomerId`, `targetRoleId`, `metadata Json?`, and `createdAt`.
  - [ ] Add indexes for `createdAt`, `action`, `entityType`, `actorEmail`, `targetCustomerId`, and `targetRoleId`.
  - [ ] Do not add foreign-key relations from `AuditLog` to `Customer` or `Role`; audit rows must survive deleted users/roles.
  - [ ] Generate a Prisma migration with a name such as `add_admin_audit_logs`.
  - [ ] Regenerate Prisma Client after schema changes.

- [ ] Add shared audit DTOs in `packages/shared-types/src/index.ts` (AC: 9-12)
  - [ ] Add `AdminAuditAction` and `AdminAuditEntityType` string union types matching Prisma enum values.
  - [ ] Add `AdminAuditLogSummary` with string ids, `actorEmail`, `action`, `entityType`, optional entity/target fields, `metadata`, and `createdAt`.
  - [ ] Add `AdminAuditLogsData` with `logs`, `nextCursor`, and `totalCount`.
  - [ ] Add `AdminAuditLogFilters` only if useful for UI/query construction.
  - [ ] Preserve existing role, user, module, and menu DTOs.

- [ ] Add reusable audit logging helpers in `apps/web/src/lib/admin-audit.ts` (AC: 1, 3-8, 13, 14)
  - [ ] Export a `writeAdminAuditLog()` helper that accepts `prisma` or a Prisma transaction client.
  - [ ] Export `mapAuditLog()` for API responses.
  - [ ] Keep metadata JSON explicit and allowlisted per action; never pass raw request bodies or full Prisma records.
  - [ ] Normalize actor fields from `getAdminAuthorization()` as `actorCustomerId` and lowercase `actorEmail`.
  - [ ] Support transaction use so mutation and audit write can commit or roll back together.
  - [ ] Add helper constants or type guards for allowed actions/entity types to prevent typo-prone string literals.

- [ ] Refactor role CRUD audit hooks (AC: 1, 3, 7, 8, 13, 14)
  - [ ] Update `apps/web/src/app/api/admin/roles/route.ts` `POST` to write `ROLE_CREATED`.
  - [ ] Update `apps/web/src/app/api/admin/roles/[roleId]/route.ts` `PUT` to write `ROLE_UPDATED`.
  - [ ] Update `apps/web/src/app/api/admin/roles/[roleId]/route.ts` `DELETE` to write `ROLE_DELETED`.
  - [ ] Replace existing successful `console.log('Admin role ...')` calls with `writeAdminAuditLog()`.
  - [ ] Log role id/name and changed fields only; do not store submitted raw JSON.
  - [ ] Preserve current authorization, Admin role rename/delete protections, duplicate-name handling, and delete conflict behavior.

- [ ] Refactor user management audit hooks (AC: 1, 4, 5, 7, 8, 13, 14)
  - [ ] Update `apps/web/src/app/api/admin/users/[userId]/route.ts` `PUT` to write `USER_UPDATED`.
  - [ ] Log target customer id and changed field names from `email`, `name`, and `company`; do not store old/new email values unless explicitly chosen as a safe metadata field.
  - [ ] Update `apps/web/src/app/api/admin/users/[userId]/roles/route.ts` `PUT` to write `USER_ROLES_UPDATED`.
  - [ ] Log target customer id and normalized role ids only.
  - [ ] Preserve last-admin guard, transactional replacement of `userRole` rows, profile validation, duplicate email conflict handling, and mapped `AdminUserSummary` responses.

- [ ] Add Story 4.5 role-module audit hook after module-mapping route exists (AC: 1, 6-8, 13, 14)
  - [ ] If `apps/web/src/app/api/admin/roles/[roleId]/modules/route.ts` is implemented by Story 4.5, update its successful `PUT` to write `ROLE_MODULES_UPDATED`.
  - [ ] Log target role id, normalized module ids, and normalized sub-module ids.
  - [ ] Preserve Story 4.5 validation: module/sub-module existence, parent mismatch rejection, canonical Admin empty-mapping conflict, and transaction semantics.
  - [ ] If Story 4.5 is still not implemented in code, leave a clearly failing or skipped test note only if the team explicitly allows it; otherwise implement Story 4.6 after 4.5 lands.

- [ ] Add admin-only audit-log API at `apps/web/src/app/api/admin/audit-logs/route.ts` (AC: 2, 9-13)
  - [ ] Reuse `getAdminAuthorization()` before parsing filters or querying audit rows.
  - [ ] Implement `GET` only; do not add create/update/delete endpoints for audit logs.
  - [ ] Parse query params with `new URL(request.url).searchParams`.
  - [ ] Support filters: `action`, `entityType`, `actorEmail`, `targetCustomerId`, `targetRoleId`, `from`, `to`, `cursor`, and `limit`.
  - [ ] Validate enum filters against known actions/entity types.
  - [ ] Validate ids as positive safe integers and dates as valid ISO timestamps.
  - [ ] Bound `limit` to 1-100 and default to 50.
  - [ ] Query newest first with a stable tie-breaker by `id`.
  - [ ] Return `ApiResponse<AdminAuditLogsData>`.
  - [ ] Return clear 400 errors such as `Invalid action filter`, `Invalid date range`, or `limit must be between 1 and 100`.

- [ ] Enable Logs tab in `apps/web/src/components/admin/AdminManagementTabs.tsx` (AC: 9-13)
  - [ ] Extend tab state to include `logs`.
  - [ ] Add a Logs tab button; the screen must be read-only.
  - [ ] Preserve Roles, Users, and Story 4.5 Modules tab behavior.
  - [ ] Avoid nested cards; keep the admin tab style compact and consistent with existing table/list surfaces.

- [ ] Add `apps/web/src/components/admin/AuditLogViewer.tsx` (AC: 9-13)
  - [ ] Fetch `/api/admin/audit-logs` with `cache: 'no-store'` from the client component.
  - [ ] Render timestamp, actor email, action label, entity label/id, and concise metadata summary.
  - [ ] Provide filters for action, entity type, actor email, target customer id, target role id, and date range.
  - [ ] Provide pagination or "Load more" using `nextCursor`.
  - [ ] Show loading, empty, error, and validation states without layout jumps.
  - [ ] Do not render any edit/delete controls for audit rows.
  - [ ] Do not expose raw JSON dumps by default; render allowlisted metadata fields in a compact summary.

- [ ] Add focused tests (AC: 1-14)
  - [ ] Unit-test `writeAdminAuditLog()` maps actor/action/entity/metadata correctly and rejects or omits unsafe metadata keys.
  - [ ] Unit-test `GET /api/admin/audit-logs`: denies non-admin before querying, returns newest-first rows, applies each supported filter, paginates, validates invalid enums/dates/ids/limit, and never exposes mutation methods.
  - [ ] Unit-test role create/update/delete APIs to assert successful mutations call audit logging and failed validation/conflict paths do not.
  - [ ] Unit-test user profile and user-role assignment APIs to assert successful mutations call audit logging and failed validation/conflict paths do not.
  - [ ] Add Story 4.5 role-module route audit tests when that route exists.
  - [ ] Component-test `AdminManagementTabs` to assert Logs tab is enabled and existing tabs still render.
  - [ ] Component-test `AuditLogViewer` for initial load, filters, pagination, empty state, API error state, and absence of edit/delete controls.
  - [ ] Add or update migration/schema validation coverage if the project has an existing Prisma schema test pattern.

## Dev Notes

### Current State

- Story 4.1 and 4.2 established `/admin`, `requireAdminSession()`, `getAdminAuthorization()`, role CRUD APIs, and `RoleManagement`.
- Story 4.3 is in `review` and added the Users tab, safe user DTOs, `adminUserSelect`, `mapAdminUser`, and profile edit APIs.
- Story 4.4 is in `review` and its uncommitted code is present in this checkout: `PUT /api/admin/users/[userId]/roles` replaces `user_role` rows transactionally and logs to console.
- Story 4.5 has a ready-for-dev story file but its expected code is not present in this checkout yet. `apps/web/src/app/api/admin/modules/route.ts` and `apps/web/src/app/api/admin/roles/[roleId]/modules/route.ts` are currently missing, and `AdminManagementTabs` still disables Modules. Implement 4.6 after 4.5 lands or include 4.5 hook work only against the final 4.5 files.
- Existing successful admin mutation routes currently use console-only logs:
  - `Admin role created`
  - `Admin role updated`
  - `Admin role deleted`
  - `Admin user updated`
  - `Admin user roles updated`
- The Prisma schema currently has no `AuditLog` model. Existing access-control models are `Customer`, `Role`, `Module`, `SubModule`, `RoleModule`, and `UserRole`.
- Because audit rows must survive deletion of users/roles, prefer denormalized actor/target fields and indexes instead of required relations.

### Files To Update

- `apps/web/prisma/schema.prisma`
  - Current state: contains auth, task, role, module, sub-module, role-module, and user-role models.
  - Change: add audit enums and `AuditLog` model with indexes and `Json?` metadata.
  - Preserve: existing table mappings, cascade behavior, and no changes to `RoleModule` or `UserRole` semantics.

- `apps/web/prisma/migrations/*/migration.sql`
  - Current state: timestamped migration folders exist under `apps/web/prisma/migrations`.
  - Change: create a new migration folder through Prisma tooling.
  - Preserve: do not edit prior migrations.

- `packages/shared-types/src/index.ts`
  - Current state: contains shared auth/menu/admin role/user DTOs and `ApiResponse<T>`.
  - Change: add audit action/entity unions and audit list DTOs.
  - Preserve: existing public contracts.

- `apps/web/src/lib/admin-audit.ts`
  - Current state: new file expected.
  - Change: centralize audit writing, DTO mapping, filter parsing helpers if useful, and safe metadata shaping.

- `apps/web/src/app/api/admin/audit-logs/route.ts`
  - Current state: new file expected.
  - Change: add admin-only read API for audit logs.

- `apps/web/src/app/api/admin/roles/route.ts`
  - Current state: list/create roles; `POST` logs successful creates to console.
  - Change: write `ROLE_CREATED` audit rows after successful create, preferably in the same transaction.
  - Preserve: `GET`, duplicate-name validation, `ApiResponse<T>`, and existing error statuses.

- `apps/web/src/app/api/admin/roles/[roleId]/route.ts`
  - Current state: update/delete roles with canonical Admin protections and console logs.
  - Change: write `ROLE_UPDATED` and `ROLE_DELETED` audit rows.
  - Preserve: async `params`, invalid id handling, duplicate handling, not-found handling, and delete conflict checks.

- `apps/web/src/app/api/admin/users/[userId]/route.ts`
  - Current state: updates user profile fields only and logs successful updates to console.
  - Change: write `USER_UPDATED` audit rows with target id and changed field names.
  - Preserve: admin-first authorization, malformed JSON handling, email validation, duplicate email conflict, and sensitive-field exclusion.

- `apps/web/src/app/api/admin/users/[userId]/roles/route.ts`
  - Current state: replaces `userRole` rows in a transaction and logs successful assignment changes to console.
  - Change: include `USER_ROLES_UPDATED` audit write in the same transaction.
  - Preserve: last-admin guard, normalized id validation, missing user/role handling, and mapped `AdminUserSummary` response.

- `apps/web/src/app/api/admin/roles/[roleId]/modules/route.ts`
  - Current state: missing in this checkout; expected from Story 4.5.
  - Change: once present, write `ROLE_MODULES_UPDATED` during successful mapping replacement.
  - Preserve: all Story 4.5 validation and transaction rules.

- `apps/web/src/components/admin/AdminManagementTabs.tsx`
  - Current state: client component with `roles` and `users`; Modules is disabled in the current checkout.
  - Change: add `logs` tab and render `AuditLogViewer`.
  - Preserve: existing role/user behavior and later Story 4.5 Modules behavior.

- `apps/web/src/components/admin/AuditLogViewer.tsx`
  - Current state: new file expected.
  - Change: read-only audit list/filter UI.

### Recommended Schema

Use Prisma enums to keep route code and filters typo-resistant:

```prisma
enum AdminAuditAction {
  ROLE_CREATED
  ROLE_UPDATED
  ROLE_DELETED
  USER_UPDATED
  USER_ROLES_UPDATED
  ROLE_MODULES_UPDATED
}

enum AdminAuditEntityType {
  ROLE
  CUSTOMER
  USER_ROLE
  ROLE_MODULE
}

model AuditLog {
  id               Int                  @id @default(autoincrement())
  actorCustomerId  Int?                 @map("actor_customer_id")
  actorEmail       String               @map("actor_email")
  action           AdminAuditAction
  entityType       AdminAuditEntityType @map("entity_type")
  entityId         String?              @map("entity_id")
  entityLabel      String?              @map("entity_label")
  targetCustomerId Int?                 @map("target_customer_id")
  targetRoleId     Int?                 @map("target_role_id")
  metadata         Json?
  createdAt        DateTime             @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([action])
  @@index([entityType])
  @@index([actorEmail])
  @@index([targetCustomerId])
  @@index([targetRoleId])
  @@map("audit_log")
}
```

Do not add required relations from `AuditLog` to `Customer` or `Role`; audit records should remain readable after target records are deleted.

### Data Contracts

Recommended shared types:

```ts
export type AdminAuditAction =
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'USER_UPDATED'
  | 'USER_ROLES_UPDATED'
  | 'ROLE_MODULES_UPDATED'

export type AdminAuditEntityType = 'ROLE' | 'CUSTOMER' | 'USER_ROLE' | 'ROLE_MODULE'

export interface AdminAuditLogSummary {
  id: string
  actorCustomerId?: string | null
  actorEmail: string
  action: AdminAuditAction
  entityType: AdminAuditEntityType
  entityId?: string | null
  entityLabel?: string | null
  targetCustomerId?: string | null
  targetRoleId?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface AdminAuditLogsData {
  logs: AdminAuditLogSummary[]
  nextCursor?: string | null
  totalCount: number
}
```

### Audit Event Rules

- Write audit rows only after authorization succeeds and the mutation is validated.
- Prefer one Prisma transaction per mutation that changes domain rows and inserts the audit row.
- If a route already uses `$transaction`, pass the transaction client into `writeAdminAuditLog()`.
- If a route does not currently use a transaction, wrap the mutating operation and audit insert together when straightforward.
- Failed authorization, validation errors, duplicate conflicts, stale ids, and last-admin guard conflicts should not create success audit rows.
- Do not store raw request bodies. Shape metadata per action:
  - `ROLE_CREATED`: `{ roleName }`
  - `ROLE_UPDATED`: `{ roleName, changedFields }`
  - `ROLE_DELETED`: `{ roleName }`
  - `USER_UPDATED`: `{ changedFields }`
  - `USER_ROLES_UPDATED`: `{ roleIds }`
  - `ROLE_MODULES_UPDATED`: `{ moduleIds, subModuleIds }`
- Keep operational error logs as `console.error` where routes already have them, but do not treat them as audit records.

### API Contract

`GET /api/admin/audit-logs`

Supported query params:

- `action`: one of the allowed audit actions.
- `entityType`: one of the allowed entity types.
- `actorEmail`: normalized lowercase exact match.
- `targetCustomerId`: positive safe integer.
- `targetRoleId`: positive safe integer.
- `from`: valid ISO timestamp, inclusive.
- `to`: valid ISO timestamp, inclusive.
- `cursor`: positive safe integer audit log id.
- `limit`: integer from 1 through 100, default 50.

Success:

```json
{
  "success": true,
  "data": {
    "logs": [],
    "nextCursor": null,
    "totalCount": 0
  }
}
```

Expected errors:

- `401 Unauthorized` or `403 Admin access required`.
- `400 Invalid action filter`.
- `400 Invalid entity type filter`.
- `400 Invalid actor email filter`.
- `400 Invalid target customer id`.
- `400 Invalid target role id`.
- `400 Invalid date range`.
- `400 limit must be between 1 and 100`.
- `500 Failed to fetch audit logs`.

### UX Guidance

- Keep Logs read-only. No edit, delete, export, or clear actions in this story.
- Use compact controls: select menus for action/entity type, text input for actor email, numeric inputs for ids, date/time inputs for date range, and a small filter/apply button.
- Render action names as readable labels while preserving enum values in API requests.
- Show timestamps in the user's locale in the browser, but keep API values as ISO strings.
- Avoid raw JSON blocks in the default view. Summarize allowlisted metadata fields in text or key/value rows.
- Keep the admin experience dense and table-oriented; no marketing copy or oversized hero sections.
- Empty state should state that no audit logs match the current filters.

### Architecture Compliance

- Keep audit logging in the Next.js web app API routes with Prisma, matching existing admin route ownership.
- Do not add BFF admin routes for audit logs.
- Server-side authorization is required for both audit-log reads and admin mutations.
- Prisma parameterized operations only; no raw SQL.
- No new dependencies are needed.
- Do not implement compliance-grade retention, export, immutable WORM storage, or monitoring integration in this story.
- Do not add client-side session checks as the authorization boundary.

### Previous Story Intelligence

- Story 4.4 established the current replacement-transaction pattern for many-to-many admin updates. Reuse that pattern for audit writes.
- Story 4.5 is a dependency for role-module audit coverage. Its story expects module-mapping writes in `apps/web/src/app/api/admin/roles/[roleId]/modules/route.ts`, but that file is not present at story creation time.
- Current `AdminManagementTabs` code in this checkout still disables Modules, despite the 4.5 story being ready-for-dev. Verify the latest file before adding Logs so a later 4.5 merge is not overwritten.
- Use `npm.cmd` on Windows for verification because prior story records show PowerShell can block `npm.ps1`.
- Existing build verification has a known issue in prior records: `npm.cmd run lint --workspace=apps/web` invokes `next lint`, which is invalid for the installed Next.js version. Do not report lint as passing unless the script is fixed.

### Git Intelligence

- Current baseline commit for this story file is `6c78e98` (`deleted apps\\web\\.next - it need not be git tracked`).
- Recent committed history does not include Story 4.3, 4.4, or 4.5 implementation files; the current checkout has uncommitted admin-user changes and story artifacts. Treat the working tree as the source of truth and do not revert unrelated changes.
- Relevant current files with uncommitted changes include `apps/web/src/app/admin/page.tsx`, `apps/web/src/components/admin/AdminManagementTabs.tsx`, `apps/web/src/components/admin/UserManagement.tsx`, `apps/web/src/lib/admin-auth.ts`, `packages/shared-types/src/index.ts`, and admin tests.

### Latest Technical Notes

- Project dependencies are locked in `apps/web/package.json`: Next.js `^16.1.6`, NextAuth `^4.24.5`, Prisma `6.19.2`, React `18.2.0`, Vitest `4.0.18`, Testing Library `16.3.2`, and MSW `2.12.10`.
- Do not upgrade dependencies for this story.
- Prisma's `Json` field type is supported for PostgreSQL and is appropriate for safe, allowlisted audit metadata.
- Prisma interactive `$transaction` is the right mechanism for combining domain mutations and audit inserts.
- Next.js App Router route handlers support method exports from `route.ts`; implement only `GET` for audit log reads.
- Existing dynamic admin routes type `params` as `Promise<...>` and `await context.params`; keep that pattern for dynamic routes touched by this story.

## References

- [Source: docs/project-context.md](../../docs/project-context.md) - stack, coding rules, scan boundaries, and verification commands.
- [Source: README.md](../../README.md) - repo workflow, Prisma commands, and test/build commands.
- [Source: _bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md](../planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md) - Epic 4 and Story 4.6 requirements.
- [Source: _bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md](../planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md) - FR.04.06 audit trail requirement and admin user journey.
- [Source: _bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/addendum.md](../planning-artifacts/prds/prd-saas_monorepo-2026-07-09/addendum.md) - audit logging scope and DB/performance decisions.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md](../planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md) - AD-09 admin audit rule and Prisma/PostgreSQL constraints.
- [Source: _bmad-output/implementation-artifacts/epic-4-context.md](./epic-4-context.md) - compiled Epic 4 constraints and cross-story dependencies.
- [Source: _bmad-output/implementation-artifacts/4-3-admin-panel-user-management-list-edit-view-roles.md](./4-3-admin-panel-user-management-list-edit-view-roles.md) - previous user-management API and UI patterns.
- [Source: _bmad-output/implementation-artifacts/4-4-admin-panel-user-role-assignment-many-to-many.md](./4-4-admin-panel-user-role-assignment-many-to-many.md) - user-role assignment transaction and testing patterns.
- [Source: _bmad-output/implementation-artifacts/4-5-admin-panel-role-module-mapping-crud.md](./4-5-admin-panel-role-module-mapping-crud.md) - role-module mapping route expected to receive audit hooks.
- [Source: apps/web/prisma/schema.prisma](../../apps/web/prisma/schema.prisma) - current schema and model conventions.
- [Source: apps/web/src/lib/admin-auth.ts](../../apps/web/src/lib/admin-auth.ts) - admin authorization helper.
- [Source: apps/web/src/app/api/admin/roles/route.ts](../../apps/web/src/app/api/admin/roles/route.ts) - role list/create route and current console log.
- [Source: apps/web/src/app/api/admin/roles/[roleId]/route.ts](../../apps/web/src/app/api/admin/roles/%5BroleId%5D/route.ts) - role update/delete route and dynamic params pattern.
- [Source: apps/web/src/app/api/admin/users/[userId]/route.ts](../../apps/web/src/app/api/admin/users/%5BuserId%5D/route.ts) - user profile mutation route.
- [Source: apps/web/src/app/api/admin/users/[userId]/roles/route.ts](../../apps/web/src/app/api/admin/users/%5BuserId%5D/roles/route.ts) - user-role assignment mutation route.
- [Source: apps/web/src/components/admin/AdminManagementTabs.tsx](../../apps/web/src/components/admin/AdminManagementTabs.tsx) - tab composition to extend.
- [Source: apps/web/src/components/admin/UserManagement.tsx](../../apps/web/src/components/admin/UserManagement.tsx) - current user/role assignment UI pattern.
- [External: Prisma JSON fields](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields) - JSON metadata support.
- [External: Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) - transaction API for mutation plus audit insert.
- [External: Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) - App Router route handler method exports.
- [External: Next.js Dynamic Routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) - async dynamic route params convention.

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-07-29: Created Story 4.6 context for database-backed admin audit trail logging and set status to ready-for-dev.
