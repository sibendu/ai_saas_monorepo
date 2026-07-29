---
baseline_commit: 22d3398618586faa2c7f7b9f95a66e4c10f241c2
---

# Story 4.3: Admin Panel - User Management List, Edit, View Roles

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an admin,
I want to list users, edit user profile details, and view each user's assigned roles,
so that I can maintain user records and verify access assignments from the admin panel.

## Acceptance Criteria

1. Given a signed-in user with the `Admin` role, when they open `/admin` and select the Users tab, then they can see all users with email, name, company, and assigned roles.
2. Given a signed-in user without the `Admin` role, when they visit `/admin` or call any `/api/admin/users` endpoint, then user data is not exposed and the request is redirected or rejected with the existing admin authorization behavior.
3. Given the user list contains users with one or more roles, when the Users tab renders, then each user's assigned roles are shown as read-only role labels or an equivalent clear display.
4. Given an admin edits a user's name, company, or email with valid values, when they save, then the change persists to PostgreSQL and the Users tab refreshes or updates in place with the saved data.
5. Given an admin submits an empty name or empty email, when the update API runs, then it returns a 400 response with a clear validation error and does not update the user.
6. Given an admin submits an invalid email format, when the update API runs, then it returns a 400 response with a clear validation error and does not update the user.
7. Given an admin changes a user's email to an email already used by another customer, when the update API runs, then it returns a 409 response and preserves the existing user records.
8. Given the target user id is invalid or stale, when the update API runs, then it returns 400 for invalid ids or 404 for missing users.
9. Given an admin views or edits users, when server code writes logs, then it does not log passwords, reset tokens, session tokens, or raw request bodies.

## Tasks / Subtasks

- [x] Add shared admin user DTOs in `packages/shared-types/src/index.ts` (AC: 1, 3, 4)
  - [x] Add `AdminUserSummary` with `id`, `email`, `name`, `company`, `roles`, `createdAt?` only if backed by schema.
  - [x] Add `AdminUserRoleSummary` with role `id`, `name`, and optional `description`.
  - [x] Add `AdminUsersData` and `AdminUserMutationRequest`.
  - [x] Keep role-assignment mutation types out of this story; Story 4.4 owns assignment.

- [x] Add admin-only user list API at `apps/web/src/app/api/admin/users/route.ts` (AC: 1, 2, 3)
  - [x] Reuse `getAdminAuthorization()` from `apps/web/src/lib/admin-auth.ts` before any query.
  - [x] Query `prisma.customer.findMany` ordered by email or name with `select`/`include` for `userRoles.role`.
  - [x] Return `ApiResponse<AdminUsersData>` with users mapped to string ids and role summaries.
  - [x] Do not return `password`, `passwordResetToken`, `passwordResetExpiresAt`, or registration internals.

- [x] Add admin-only user update API at `apps/web/src/app/api/admin/users/[userId]/route.ts` (AC: 2, 4, 5, 6, 7, 8, 9)
  - [x] Use the existing dynamic route pattern: `params` is a `Promise`, parse `userId` as a positive integer.
  - [x] Read JSON defensively and return `400` for malformed bodies.
  - [x] Normalize `name`, `email`, and `company`; store blank company as `null`.
  - [x] Validate required name and email, and validate email with a conservative format check.
  - [x] Check duplicate email with `prisma.customer.findFirst({ where: { email: { equals, mode: 'insensitive' }, NOT: { id } } })`; return `409` if found.
  - [x] Update only `email`, `name`, and `company`; never update roles, passwords, reset tokens, or registration type here.
  - [x] Return the same `AdminUserSummary` shape after update, including assigned roles.

- [x] Extend the admin page to enable the Users tab (AC: 1, 3, 4)
  - [x] Update `apps/web/src/app/admin/page.tsx` to load initial users alongside roles after `requireAdminSession()`.
  - [x] Replace the disabled Users placeholder with a functional tab while leaving Modules disabled for Story 4.5.
  - [x] Keep `AppShell`, `getAuthenticatedShellData()`, and the existing page title/subtitle behavior intact.
  - [x] Preserve role management behavior from Story 4.2.

- [x] Add a user-management UI component under `apps/web/src/components/admin/` (AC: 1, 3, 4, 5, 6, 7, 8)
  - [x] Prefer `UserManagement.tsx` as a client component mirroring the `RoleManagement.tsx` API/read-response pattern.
  - [x] Render a responsive table or dense list with email, name, company, assigned roles, and edit actions.
  - [x] Show roles read-only as labels/chips; do not add role assignment controls in this story.
  - [x] Support inline edit or a compact edit form for name, email, and company.
  - [x] Show loading, success, empty, and error states without disrupting the role tab.
  - [x] On successful update, replace the edited row from the API response or refresh `/api/admin/users`.

- [x] Add focused tests (AC: 1-8)
  - [x] Unit-test `GET /api/admin/users`: denies non-admin, returns users with roles, omits sensitive fields.
  - [x] Unit-test `PUT /api/admin/users/[userId]`: malformed JSON, invalid id, blank required fields, invalid email, duplicate email, missing user, successful update.
  - [x] Add component tests for user list rendering, role display, successful edit, and API validation errors using the existing MSW pattern.
  - [x] Add or update page-level tests if tab wiring is extracted into a component.

## Dev Notes

### Current State

- Story 4.1 and 4.2 are done. `/admin` already exists, is server-side protected by `requireAdminSession()`, renders `AppShell`, shows enabled Roles and disabled Users/Modules buttons, and renders `RoleManagement`.
- Admin authorization is centralized in `apps/web/src/lib/admin-auth.ts`. It gets the current session, finds the customer by email, includes `userRoles.role`, and treats role name `admin` case-insensitively.
- Role APIs already use `ApiResponse<T>`, `NextResponse.json`, defensive JSON parsing, explicit status codes, Prisma error mapping, and admin-first authorization.
- Current user profile editing exists only for the signed-in user's preferences route; do not reuse its API directly because admin edits need admin authorization, target user ids, duplicate-email checks, and `ApiResponse<T>` consistency.

### Files To Update

- `packages/shared-types/src/index.ts`
  - Current state: contains shared `Role`, `UserRole`, `AdminRoleSummary`, `AdminRolesData`, and `AdminRoleMutationRequest`.
  - Change: add admin user DTOs near the existing admin role DTOs.
  - Preserve: existing public `Customer`, role/menu, dashboard, and `ApiResponse<T>` types.

- `apps/web/src/app/admin/page.tsx`
  - Current state: server component checks admin access, loads shell data and roles, renders disabled Users/Modules tab buttons, and renders `RoleManagement`.
  - Change: load initial users and wire a functional Users tab.
  - Preserve: server-side admin gate before data load, role-management UI, `AppShell` menu behavior, and Modules placeholder disabled until Story 4.5.

- `apps/web/src/components/admin/RoleManagement.tsx`
  - Current state: owns role CRUD state and calls `/api/admin/roles`.
  - Change: avoid changes unless tab composition requires prop or layout adjustments.
  - Preserve: role create/edit/delete behavior and messages.

- `apps/web/src/lib/admin-auth.ts`
  - Current state: shared admin authorization helper.
  - Change: none expected.
  - Preserve: fail-closed behavior and redirects.

- `apps/web/prisma/schema.prisma`
  - Current state: `Customer.email` is mapped to database column `username`; `Customer` has `password`, `passwordResetToken`, `passwordResetExpiresAt`, optional `company`, and `userRoles`.
  - Change: none expected for this story.
  - Preserve: no schema or migration changes unless explicitly renegotiated.

### New Files Expected

- `apps/web/src/app/api/admin/users/route.ts`
- `apps/web/src/app/api/admin/users/[userId]/route.ts`
- `apps/web/src/components/admin/UserManagement.tsx`
- Tests colocated with route files and/or under `apps/web/src/tests/unit/`, following existing admin role test patterns.

### Data Contract

Recommended shared types:

```ts
export interface AdminUserRoleSummary {
  id: string
  name: string
  description?: string | null
}

export interface AdminUserSummary {
  id: string
  email: string
  name: string
  company?: string | null
  roles: AdminUserRoleSummary[]
}

export interface AdminUsersData {
  users: AdminUserSummary[]
}

export interface AdminUserMutationRequest {
  email: string
  name: string
  company?: string | null
}
```

Do not include `createdAt`/`updatedAt` for users unless the Prisma `Customer` model actually exposes those fields. The current schema does not.

### API Rules

- `GET /api/admin/users`
  - Auth: `getAdminAuthorization()` first.
  - Success: `200` with `{ success: true, data: { users } }`.
  - Query: `prisma.customer.findMany({ orderBy: { email: 'asc' }, select: { id, email, name, company, userRoles: { include/select role } } })`.
  - Sensitive fields must never be selected or returned.

- `PUT /api/admin/users/[userId]`
  - Auth: `getAdminAuthorization()` first.
  - Validate id before reading/updating.
  - Malformed JSON: `400 Invalid JSON request body`.
  - Empty name: `400 Name is required`.
  - Empty email: `400 Email is required`.
  - Invalid email: `400 Email format is invalid`.
  - Duplicate email: `409 A user with this email already exists`.
  - Missing user: `404 User not found`.
  - Success: `200` with `{ success: true, data: user, message: 'User updated successfully' }`.

### UX Guidance

- Keep the admin panel work-focused and consistent with the existing role table style: compact cards, table rows, clear actions, and no marketing-style layout.
- Roles on the user list are read-only in this story. Use labels/chips or compact comma-separated role names; show a clear empty state such as `No roles assigned`.
- User-role assignment controls belong to Story 4.4. Do not add checkboxes or multiselects yet.
- The Users tab should not navigate away from `/admin` unless the implementation deliberately chooses URL-driven tabs. If URL-driven tabs are used, preserve direct access and back/forward behavior.
- Empty user list, API failure, validation failure, and successful update states must be visible and clear.

### Architecture Compliance

- Keep admin user management in the Next.js web app API routes with Prisma, matching Story 4.2. The earlier planning ambiguity around moving admin logic to the BFF is resolved by the existing implementation.
- Use server-side authorization for both page and API access. Client-side tab/menu hiding is not authorization.
- Use Prisma parameterized queries only; no raw SQL/string interpolation.
- Keep the BFF private and do not add public BFF admin routes.
- Preserve the two-level permission model; this story only displays role names already assigned through `user_role`.
- Avoid logging secrets/tokens/passwords and avoid logging raw request bodies.

### Previous Story Intelligence

- Story 4.2 added and hardened:
  - `apps/web/src/lib/admin-auth.ts`
  - `apps/web/src/app/admin/page.tsx`
  - `apps/web/src/components/admin/RoleManagement.tsx`
  - `apps/web/src/app/api/admin/roles/route.ts`
  - `apps/web/src/app/api/admin/roles/[roleId]/route.ts`
  - `packages/shared-types/src/index.ts`
  - Focused unit/component tests.
- Review hardening added canonical Admin role protections, malformed JSON handling, Prisma conflict/not-found mapping, conditional delete conflict handling, and admin lookup failure behavior.
- Continue using `npm.cmd` on Windows for verification because PowerShell can block `npm.ps1`.

### Git Intelligence

- Recent commits `50710ef` and `13647f5` are directly relevant. They introduced and hardened the admin role-management surface and should be treated as the implementation pattern for this story.
- Recent changed files include the admin page, role management component, admin auth helper, admin role API routes, shared types, and tests.

### Latest Technical Notes

- Project dependencies are locked in `apps/web/package.json`: Next.js `^16.1.6`, NextAuth `^4.24.5`, Prisma `6.19.2`, React `18.2.0`, Vitest `4.0.18`, Testing Library `16.3.2`.
- Do not upgrade dependencies for this story.
- Next.js App Router dynamic route handlers should type `params` as a `Promise` and `await params`, matching the existing `[roleId]` route and current official docs.
- NextAuth server-side code should use the existing project helpers around `getServerSession`; do not add client-side session checks for API authorization.
- Prisma relation reads with `select`/`include` and relation counts are supported and match the existing role-management approach.

## References

- [Source: docs/project-context.md](../../docs/project-context.md) - project stack, coding rules, test commands, scan boundaries.
- [Source: _bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md](../planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md) - Epic 4 and Story 4.3 requirements.
- [Source: _bmad-output/implementation-artifacts/epic-4-context.md](./epic-4-context.md) - compiled Epic 4 constraints and cross-story dependencies.
- [Source: _bmad-output/implementation-artifacts/spec-4-1-4-2-admin-role-management.md](./spec-4-1-4-2-admin-role-management.md) - previous Story 4.1/4.2 implementation record.
- [Source: apps/web/src/app/admin/page.tsx](../../apps/web/src/app/admin/page.tsx) - current admin page shell and disabled Users tab.
- [Source: apps/web/src/lib/admin-auth.ts](../../apps/web/src/lib/admin-auth.ts) - admin authorization helper to reuse.
- [Source: apps/web/src/app/api/admin/roles/route.ts](../../apps/web/src/app/api/admin/roles/route.ts) - admin API list/create pattern.
- [Source: apps/web/src/app/api/admin/roles/[roleId]/route.ts](../../apps/web/src/app/api/admin/roles/[roleId]/route.ts) - dynamic route update/delete pattern.
- [Source: apps/web/prisma/schema.prisma](../../apps/web/prisma/schema.prisma) - Customer/UserRole/Role schema.
- [External: Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) - dynamic route params pattern.
- [External: NextAuth.js Next.js configuration](https://next-auth.js.org/configuration/nextjs) - server-side session retrieval guidance.
- [External: Prisma relation queries](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries) - relation include/select guidance.

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

- 2026-07-18: Red phase confirmed new tests failed due missing `/api/admin/users` routes and `UserManagement` component.
- 2026-07-18: Focused admin user tests passed: `npm.cmd exec --workspace=apps/web -- vitest run src/app/api/admin/users/admin-users.unit.test.ts src/app/api/admin/users/[userId]/admin-user-detail.unit.test.ts src/tests/unit/UserManagement.unit.test.tsx src/tests/unit/AdminManagementTabs.unit.test.tsx`.
- 2026-07-18: Type checking passed: `npm.cmd run type-check`.
- 2026-07-18: Full regression suite passed: `npm.cmd run test`.
- 2026-07-18: Web lint script attempted with `npm.cmd run lint --workspace=apps/web`; failed before linting because `next lint` is not valid for the installed Next.js version and is treated as a project directory.

### Completion Notes List

- Added shared admin user DTOs without adding role assignment mutation types or unsupported timestamp fields.
- Added admin-only user list and update APIs that authorize before queries, select only safe user fields, validate malformed/invalid update requests, handle duplicate and stale users, and return assigned roles read-only.
- Added `UserManagement` and `AdminManagementTabs` so `/admin` can switch between existing role management and the new user list/edit surface while Modules remains disabled for Story 4.5.
- Added focused route and component tests for authorization, sensitive-field omission, role labels, edit success, validation errors, duplicate email, missing users, and tab wiring.
- Stabilized existing BFF Vitest behavior by preventing local env `NODE_ENV` values from bypassing test fallback paths or starting the server during tests.

### File List

- apps/bff/src/index.ts
- apps/bff/src/routes/tasks.ts
- apps/web/src/app/admin/page.tsx
- apps/web/src/app/api/admin/users/route.ts
- apps/web/src/app/api/admin/users/admin-users.unit.test.ts
- apps/web/src/app/api/admin/users/[userId]/route.ts
- apps/web/src/app/api/admin/users/[userId]/admin-user-detail.unit.test.ts
- apps/web/src/components/admin/AdminManagementTabs.tsx
- apps/web/src/components/admin/UserManagement.tsx
- apps/web/src/lib/admin-users.ts
- apps/web/src/tests/unit/AdminManagementTabs.unit.test.tsx
- apps/web/src/tests/unit/UserManagement.unit.test.tsx
- packages/shared-types/src/index.ts

### Change Log

- 2026-07-18: Implemented Story 4.3 admin user management list/edit/view roles and moved story to review.
