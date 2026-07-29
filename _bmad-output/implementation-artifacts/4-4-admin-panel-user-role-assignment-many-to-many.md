---
baseline_commit: 6c78e9892880416dbe22b3b518d623db9c4ca4af
---

# Story 4.4: Admin Panel - User-Role Assignment Many-to-Many

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an admin,
I want to assign and unassign multiple roles for a user from the admin Users tab,
so that user permissions can be changed without direct database edits.

## Acceptance Criteria

1. Given a signed-in user with the `Admin` role, when they open the Users tab in `/admin`, then each user row exposes role assignment controls using the available roles.
2. Given a signed-in user without the `Admin` role, when they call any user-role assignment endpoint, then no role data or mutation is exposed and the request is rejected with existing admin authorization behavior.
3. Given an admin selects multiple roles for a user and saves, when the update succeeds, then the user's `user_role` rows are replaced with exactly those roles and the Users tab shows the updated role labels.
4. Given an admin deselects one or more roles and saves, when the update succeeds, then the removed roles no longer appear on the user and are removed from PostgreSQL.
5. Given an admin saves an empty role selection, when the target is not the last remaining admin user, then all roles are removed for that user and the UI shows `No roles assigned`.
6. Given the target user id is invalid or stale, when the assignment API runs, then it returns 400 for invalid ids or 404 for missing users.
7. Given the request body is malformed, missing `roleIds`, contains duplicate role ids, non-positive ids, or unknown role ids, when the assignment API runs, then it returns a 400 response and preserves existing assignments.
8. Given the update would remove the `Admin` role from the only remaining admin user, when the assignment API runs, then it returns 409 and preserves that user's existing admin assignment.
9. Given role assignments change for a user, when that user next triggers server-side menu loading through navigation, refresh, or next login, then permissions reflect the updated role set.
10. Given the assignment endpoint logs the action, when logs are written, then they include actor, target user id, and assigned role ids only; passwords, reset tokens, session tokens, and raw request bodies are never logged.

## Tasks / Subtasks

- [x] Add shared role-assignment DTOs in `packages/shared-types/src/index.ts` (AC: 1, 3, 5, 7)
  - [x] Add `AdminUserRoleAssignmentRequest` with `roleIds: string[]`.
  - [x] Add `AdminAssignableRoleSummary` only if `AdminRoleSummary` is too broad for the checkbox UI; otherwise reuse `AdminRoleSummary`.
  - [x] Keep existing `AdminUserSummary.roles` as the display source after mutation.
  - [x] Do not add schema types for audit logs or role-module mapping in this story.

- [x] Add admin-only assignment API at `apps/web/src/app/api/admin/users/[userId]/roles/route.ts` (AC: 2-8, 10)
  - [x] Reuse `getAdminAuthorization()` before parsing or querying role/user data.
  - [x] Type dynamic route context with `params: Promise<{ userId: string }>` and `await context.params`, matching existing dynamic admin routes.
  - [x] Parse `userId` as a positive integer and return `400 Invalid user id` for bad values.
  - [x] Read JSON defensively and return `400 Invalid JSON request body` for malformed bodies.
  - [x] Validate `roleIds` is an array of unique positive integer strings; return `400` without DB mutation for bad or duplicate ids.
  - [x] Verify the target customer exists before writing; return `404 User not found` when stale.
  - [x] Verify every requested role id exists; return `400 One or more roles were not found` for unknown roles.
  - [x] Guard against lockout: if the target user is the only user currently assigned the `Admin` role and the submitted roles exclude `Admin`, return `409 At least one admin user is required`.
  - [x] Replace assignments in a single Prisma transaction: delete current `userRole` rows for `customerId`, then `createMany` requested `(customerId, roleId)` rows; allow an empty role list.
  - [x] Return `200` with `ApiResponse<AdminUserSummary>` using `adminUserSelect` and `mapAdminUser` so UI state stays consistent.
  - [x] Log a minimal assignment event with `actorEmail`, `targetUserId`, and normalized `roleIds`.

- [x] Extend `/admin` data flow and tab composition (AC: 1, 3, 5)
  - [x] Keep `apps/web/src/app/admin/page.tsx` server-side admin gate before all data loads.
  - [x] Pass available roles from `AdminManagementTabs` into `UserManagement`; do not add a second role list fetch on initial render.
  - [x] Preserve existing Roles tab behavior and keep Modules disabled for Story 4.5.
  - [x] Preserve `AppShell`, `getAuthenticatedShellData()`, and existing page title/subtitle behavior.

- [x] Add role assignment controls in `apps/web/src/components/admin/UserManagement.tsx` (AC: 1, 3-5, 7)
  - [x] Extend `UserManagementProps` to receive `availableRoles`.
  - [x] Keep the current profile edit flow for name/email/company working independently.
  - [x] Add compact checkbox or multi-select controls per user row; checkboxes are preferred because role membership is binary and visible.
  - [x] Initialize each user's selection from `user.roles`.
  - [x] Save assignments with `PUT /api/admin/users/${userId}/roles` and `{ roleIds }`.
  - [x] On success, replace the updated user row from the API response and show a clear success message.
  - [x] On failure, keep the edited selection visible and show the API error without overwriting current persisted role labels.
  - [x] Show an empty state for no available roles; do not invent roles client-side.

- [x] Add focused tests (AC: 1-8)
  - [x] Unit-test `PUT /api/admin/users/[userId]/roles`: denies non-admin before queries, invalid id, malformed JSON, missing/non-array `roleIds`, invalid ids, duplicate ids, unknown roles, missing user, last-admin removal conflict, empty assignment success, and multi-role success.
  - [x] Assert the success path uses a Prisma transaction and returns the mapped `AdminUserSummary`.
  - [x] Component-test `UserManagement`: renders available role checkboxes, initializes checked roles, saves changed assignments, clears all roles, shows API validation/conflict errors, and keeps profile edit behavior intact.
  - [x] Update `AdminManagementTabs` tests to assert roles are passed to the Users tab and Modules remains disabled.

## Dev Notes

### Current State

- Story 4.1/4.2 established the protected `/admin` page, shared `getAdminAuthorization()` helper, role CRUD APIs, `RoleManagement`, and shared admin role DTOs.
- Story 4.3 is in `review` and has already added the Users tab, read-only role labels, profile edit APIs, `adminUserSelect`, `mapAdminUser`, and user-management tests.
- The current Users tab only displays assigned roles and edits profile fields. Story 4.4 owns mutation of `user_role`; do not mix role assignment into the existing profile update endpoint.
- `Role` deletion is already guarded when roles have assigned users, so user-role assignment must keep role counts accurate by writing the existing `UserRole` table rather than storing denormalized role names.

### Files To Update

- `packages/shared-types/src/index.ts`
  - Current state: has `AdminRoleSummary`, `AdminUserRoleSummary`, `AdminUserSummary`, `AdminUsersData`, and `AdminUserMutationRequest`.
  - Change: add the role-assignment request type near existing admin user DTOs.
  - Preserve: existing public role/menu/customer contracts and `ApiResponse<T>`.

- `apps/web/src/app/api/admin/users/[userId]/roles/route.ts`
  - Current state: new file expected.
  - Change: implement admin-only assignment replacement endpoint.
  - Preserve: same response and error style used by `apps/web/src/app/api/admin/users/[userId]/route.ts`.

- `apps/web/src/components/admin/UserManagement.tsx`
  - Current state: client component owns users state, inline profile edit form, read-only role chips, loading/success/error messages.
  - Change: add role assignment controls and save flow.
  - Preserve: existing profile update UX, role labels, empty/error/success states, and table layout.

- `apps/web/src/components/admin/AdminManagementTabs.tsx`
  - Current state: receives `initialRoles` and `initialUsers`, renders Roles or Users tab, but passes only users to `UserManagement`.
  - Change: pass `initialRoles` as available roles into `UserManagement`.
  - Preserve: active tab state and disabled Modules button.

- `apps/web/src/app/admin/page.tsx`
  - Current state: loads roles and users after `requireAdminSession()`.
  - Change: none expected unless prop names change.
  - Preserve: server-side admin authorization before data fetching.

- `apps/web/prisma/schema.prisma`
  - Current state: `UserRole` already models the many-to-many assignment with composite primary key `@@id([customerId, roleId])`, mapped columns, and cascading relations.
  - Change: none expected.
  - Preserve: no migration or schema changes unless explicitly renegotiated.

### API Contract

Recommended request:

```ts
export interface AdminUserRoleAssignmentRequest {
  roleIds: string[]
}
```

Endpoint:

`PUT /api/admin/users/[userId]/roles`

Success:

```json
{
  "success": true,
  "data": {
    "id": "2",
    "email": "jane@example.com",
    "name": "Jane User",
    "company": "Acme",
    "roles": [
      { "id": "1", "name": "Admin", "description": "Full access" }
    ]
  },
  "message": "User roles updated successfully"
}
```

Validation and conflict responses should follow existing admin routes:

- `401 Unauthorized` or `403 Admin access required` from `getAdminAuthorization()`.
- `400 Invalid user id`.
- `400 Invalid JSON request body`.
- `400 roleIds must be an array`.
- `400 Role ids must be unique positive integers`.
- `400 One or more roles were not found`.
- `404 User not found`.
- `409 At least one admin user is required`.
- `500 Failed to update user roles` for unexpected errors only.

### Persistence Rules

- Use `prisma.userRole`, not nested writes through `customer.update`, so the replacement semantics are explicit and easy to test.
- Use a transaction so partial writes cannot leave the target with half-applied roles:

```ts
await prisma.$transaction(async (tx) => {
  await tx.userRole.deleteMany({ where: { customerId } })
  if (roleIds.length > 0) {
    await tx.userRole.createMany({
      data: roleIds.map((roleId) => ({ customerId, roleId })),
    })
  }
})
```

- Normalize ids once and use the normalized numeric set throughout the endpoint.
- The empty role list is valid because admins must be able to unassign roles. The only exception is the last-admin guard.
- After the transaction, fetch the user with `adminUserSelect` and return `mapAdminUser(user)`.

### UX Guidance

- Keep the admin panel compact and table-oriented, consistent with `RoleManagement` and current `UserManagement`.
- Role assignment controls should be visible where the admin already sees role labels. Avoid a separate route unless the existing table becomes unusable on mobile.
- Use checkbox controls for roles when practical; they make many-to-many membership explicit and avoid hidden multi-select state.
- Keep profile edit and role assignment saves separate. A failed role save must not block profile edits, and a failed profile edit must not overwrite role selections.
- Use clear button labels such as `Save roles` and keep disabled/loading states stable so table rows do not shift unexpectedly.
- If no roles exist, show a concise empty state and disable assignment saves.

### Architecture Compliance

- Keep this in the Next.js web app API routes with Prisma, matching Stories 4.2 and 4.3. Do not add BFF admin routes for this story.
- Authorization is server-side. Hiding controls in the client is only UX, not security.
- Preserve the two-level permission model. Story 4.4 assigns roles to users; Story 4.5 owns role-to-module grants.
- Do not add new dependencies, state libraries, schema changes, or a separate user detail page unless implementation proves the existing Users tab cannot support the workflow.
- Use Prisma parameterized operations only; no raw SQL.
- Do not log passwords, password reset tokens, session tokens, OAuth provider internals, or raw request bodies.

### Previous Story Intelligence

- Story 4.3 added:
  - `apps/web/src/app/api/admin/users/route.ts`
  - `apps/web/src/app/api/admin/users/[userId]/route.ts`
  - `apps/web/src/components/admin/AdminManagementTabs.tsx`
  - `apps/web/src/components/admin/UserManagement.tsx`
  - `apps/web/src/lib/admin-users.ts`
  - focused API and component tests.
- Continue using `adminUserSelect` and `mapAdminUser`; do not duplicate mapping logic in the new assignment route.
- Current profile update route validates before writes and maps Prisma `P2025`/`P2002`. Use the same defensive style for assignment errors.
- Story 4.3 verification used `npm.cmd` on Windows because PowerShell can block `npm.ps1`.
- Story 4.3 is still `review` in sprint status, so verify its current files before implementation and avoid assuming review changes are final.

### Git Intelligence

- Current baseline commit for this story file is `6c78e98` (`deleted apps\web\.next - it need not be git tracked`).
- Recent git history in this checkout does not show the Story 4.3 implementation commits, so rely on the working tree files and Story 4.3 record for current admin-user patterns.
- The worktree has an unrelated modified `.gitignore`; do not revert it.

### Latest Technical Notes

- Project dependencies are locked in `apps/web/package.json`: Next.js `^16.1.6`, NextAuth `^4.24.5`, Prisma `6.19.2`, React `18.2.0`, Vitest `4.0.18`, Testing Library `16.3.2`, MSW `2.12.10`.
- Do not upgrade dependencies for this story.
- Current Next.js docs show dynamic route `params` as async in App Router file conventions and route handlers; follow the existing project pattern with `params: Promise<...>` and `await context.params`.
- NextAuth docs still support `getServerSession` for server-side session retrieval in Next.js; use the existing `getCurrentSession()` and `getAdminAuthorization()` wrappers rather than adding client-side session checks.
- Prisma docs support `$transaction`, `deleteMany`, and `createMany`; use them to replace many-to-many assignments atomically.

## References

- [Source: docs/project-context.md](../../docs/project-context.md) - stack, coding rules, project structure, and verification commands.
- [Source: _bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md](../planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md) - Epic 4 and Story 4.4 requirements.
- [Source: _bmad-output/implementation-artifacts/epic-4-context.md](./epic-4-context.md) - compiled Epic 4 constraints and cross-story dependencies.
- [Source: _bmad-output/implementation-artifacts/4-3-admin-panel-user-management-list-edit-view-roles.md](./4-3-admin-panel-user-management-list-edit-view-roles.md) - previous story state and implementation patterns.
- [Source: _bmad-output/implementation-artifacts/spec-4-1-4-2-admin-role-management.md](./spec-4-1-4-2-admin-role-management.md) - admin authorization and role CRUD baseline.
- [Source: apps/web/prisma/schema.prisma](../../apps/web/prisma/schema.prisma) - `UserRole` many-to-many schema.
- [Source: apps/web/src/lib/admin-auth.ts](../../apps/web/src/lib/admin-auth.ts) - admin authorization helper.
- [Source: apps/web/src/lib/admin-users.ts](../../apps/web/src/lib/admin-users.ts) - shared user select and mapper.
- [Source: apps/web/src/app/api/admin/users/[userId]/route.ts](../../apps/web/src/app/api/admin/users/[userId]/route.ts) - dynamic admin user route pattern.
- [Source: apps/web/src/components/admin/UserManagement.tsx](../../apps/web/src/components/admin/UserManagement.tsx) - existing Users tab component to extend.
- [Source: packages/shared-types/src/index.ts](../../packages/shared-types/src/index.ts) - shared admin DTOs.
- [External: Next.js Dynamic Routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) - async dynamic params convention.
- [External: Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) - App Router route handler conventions.
- [External: NextAuth.js Next.js Configuration](https://next-auth.js.org/configuration/nextjs) - server-side session retrieval guidance.
- [External: Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) - transaction API for atomic replacement.
- [External: Prisma CRUD](https://www.prisma.io/docs/orm/prisma-client/queries/crud) - `deleteMany`/`createMany` behavior.

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

- 2026-07-29: Red-phase focused tests failed as expected because `apps/web/src/app/api/admin/users/[userId]/roles/route.ts` and Users-tab role controls did not exist yet.
- 2026-07-29: `npm.cmd run test:unit --workspace=apps/web -- admin-user-roles UserManagement AdminManagementTabs` passed: 18 files, 70 tests.
- 2026-07-29: `npm.cmd run type-check` passed after restoring workspace links with `npm.cmd install` and adding strict callback/result typing.
- 2026-07-29: `npm.cmd run test` passed: web and BFF unit/integration suites.
- 2026-07-29: `npm.cmd run lint --workspace=apps/web` did not execute linting; `next lint` failed with `Invalid project directory provided, no such directory: ...\apps\web\lint`.
- 2026-07-29: `npm.cmd run build --workspace=apps/web` compiled and ran TypeScript, then failed on existing Prisma CLI/config environment: first missing generated `@prisma/client`, then `prisma.config.ts` could not resolve `prisma/config` because the workspace does not link `prisma` for `apps/web`.

### Completion Notes List

- Added the shared `AdminUserRoleAssignmentRequest` DTO and reused existing role/user summaries for UI and API responses.
- Added admin-only `PUT /api/admin/users/[userId]/roles` with authorization before data access, defensive input validation, user/role existence checks, last-admin lockout protection, transactional replacement of `userRole` rows, mapped `AdminUserSummary` response, and minimal safe logging.
- Extended the Admin Users tab to receive existing server-loaded roles, render compact per-row role checkboxes, save role changes independently from profile edits, preserve edited selections on API failure, and support empty successful assignments.
- Added focused API and component/tab tests for the assignment flow, validation errors, transaction behavior, empty role assignment, and tab role propagation.
- Added strict local typings in adjacent admin code paths so the restored workspace type-check passes.

### File List

- packages/shared-types/src/index.ts
- apps/web/src/app/api/admin/users/[userId]/roles/route.ts
- apps/web/src/app/api/admin/users/[userId]/roles/admin-user-roles.unit.test.ts
- apps/web/src/app/admin/page.tsx
- apps/web/src/components/admin/AdminManagementTabs.tsx
- apps/web/src/components/admin/UserManagement.tsx
- apps/web/src/lib/admin-auth.ts
- apps/web/src/tests/unit/AdminManagementTabs.unit.test.tsx
- apps/web/src/tests/unit/UserManagement.unit.test.tsx
- _bmad-output/implementation-artifacts/4-4-admin-panel-user-role-assignment-many-to-many.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-07-29: Created Story 4.4 context for admin user-role assignment and set status to ready-for-dev.
- 2026-07-29: Implemented admin user-role assignment API, Users-tab role controls, strict typing fixes, and focused tests; moved story to review.
