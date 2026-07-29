---
title: 'Stories 4.1 and 4.2: Admin Role Management'
type: 'feature'
created: '2026-07-17'
status: 'done'
review_loop_iteration: 0
baseline_commit: '1fb87b3b28fdbec874e8d4b9cb816e968acffe46'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The application has role and module data, but it does not yet expose an admin-only area where authorized users can manage roles. Without this, permission configuration still requires direct database or seed changes.

**Approach:** Add a protected `/admin` experience that only users with the `Admin` role can render, and implement role list/create/edit/delete behavior in that area. Enforce admin authorization on every admin API route before exposing role data or mutations.

## Boundaries & Constraints

**Always:** Use the existing Next.js web app, Prisma schema, NextAuth session model, and AppShell/menu patterns. Verify admin membership server-side from `customer -> userRoles -> role`, treating role name case-insensitively. Return clear validation errors for missing, duplicate, or invalid role names.

**Ask First:** Adding new database tables, changing the role schema, moving admin logic to the BFF, or introducing deeper permission trees.

**Never:** Trust client-side menu hiding as authorization, expose admin APIs to non-admin sessions, delete roles that still have assigned users or module mappings without a guarded error, or log secrets/tokens.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin page access | Signed-in user has `Admin` role | `/admin` renders AppShell, admin tabs, and the role-management panel | N/A |
| Non-admin page access | Signed-in user lacks `Admin` role | User is redirected away before admin UI renders | Redirect to `/dashboard` |
| Role list | Admin calls role API | Response includes roles sorted by name with description and assignment counts | 401/403 for missing or non-admin session |
| Role create/update | Admin submits non-empty unique name | Role persists and list refreshes | 400 for empty name, 409 for duplicates |
| Role delete | Admin deletes unused role | Role is removed | 409 when role has users or module mappings |

</frozen-after-approval>

## Code Map

- `apps/web/src/lib/admin-auth.ts` -- shared server-side admin session and role authorization helpers.
- `apps/web/src/app/admin/page.tsx` -- protected admin page shell with tabs and role-management content.
- `apps/web/src/components/admin/RoleManagement.tsx` -- client-side role CRUD table and forms.
- `apps/web/src/app/api/admin/roles/route.ts` -- admin-only list/create role API.
- `apps/web/src/app/api/admin/roles/[roleId]/route.ts` -- admin-only update/delete role API.
- `apps/web/src/lib/role-menu.ts` -- appends the Admin navigation entry only for users with the Admin role.
- `packages/shared-types/src/index.ts` -- shared admin role DTOs and request/response types.
- `apps/web/src/tests/unit` and `apps/web/src/tests/integration` -- focused authorization, validation, and UI tests.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/lib/admin-auth.ts` -- add reusable helpers to require an authenticated admin and return the active customer.
- [x] `packages/shared-types/src/index.ts` -- add admin role DTOs and mutation request/response interfaces.
- [x] `apps/web/src/app/api/admin/roles/route.ts` and `[roleId]/route.ts` -- implement list, create, update, and guarded delete with Prisma validation.
- [x] `apps/web/src/components/admin/RoleManagement.tsx` -- implement role table, inline create/edit/delete controls, loading, empty, and error states.
- [x] `apps/web/src/app/admin/page.tsx` -- render the protected admin area with tabs for Roles, Users, and Modules, with Users/Modules placeholders disabled until later stories.
- [x] `apps/web/src/lib/role-menu.ts` -- add an Admin section linking to `/admin` only when the signed-in user has the Admin role.
- [x] `apps/web/src/tests` -- cover admin authorization, API validation/conflict cases, and role-management interactions.

**Acceptance Criteria:**
- Given a signed-in user with the `Admin` role, when they visit `/admin`, then they see the admin page and can list roles.
- Given a signed-in non-admin user, when they visit `/admin` or call `/api/admin/roles`, then admin UI/data is not exposed.
- Given an admin submits a blank role name, when the create or update API runs, then it returns a 400 response with a clear error.
- Given an admin submits a duplicate role name, when the create or update API runs, then it returns a 409 response without changing the existing role.
- Given an admin deletes a role assigned to users or modules, when the delete API runs, then it returns a 409 response and preserves the role.

## Spec Change Log

## Design Notes

Keep authorization in the web app because sessions already live there, and use Prisma directly in Next.js API routes for this epic's first admin surface. Later stories can reuse the same admin helper for Users, User Roles, Modules, and audit logging.

## Verification

**Commands:**
- `npm.cmd run type-check --workspace=apps/web` -- passed.
- `npm.cmd run test:unit --workspace=apps/web` -- passed, 13 files / 45 tests.
- `npm.cmd run test:integration --workspace=apps/web` -- passed, 2 files / 3 tests.

**Notes:**
- Review patch added canonical `Admin` role guards, conditional role delete, malformed JSON handling, Prisma conflict/not-found mapping, and focused PUT/delete tests.
- PowerShell blocks `npm.ps1`, so verification used `npm.cmd` for the same npm scripts.

## Suggested Review Order

**Admin Gate**

- Server-side role check is the authorization root for pages and APIs.
  [`admin-auth.ts:44`](../../apps/web/src/lib/admin-auth.ts#L44)

- Lookup failures now return explicit authorization errors for API callers.
  [`admin-auth.ts:59`](../../apps/web/src/lib/admin-auth.ts#L59)

- Shell data appends Admin navigation only for verified admins.
  [`role-menu.ts:119`](../../apps/web/src/lib/role-menu.ts#L119)

**Admin Surface**

- Admin page blocks non-admins before role data or UI renders.
  [`page.tsx:32`](../../apps/web/src/app/admin/page.tsx#L32)

- Role table owns create, edit, delete, loading, and message state.
  [`RoleManagement.tsx:24`](../../apps/web/src/components/admin/RoleManagement.tsx#L24)

**Role APIs**

- Role list/create endpoint validates JSON, names, duplicates, and Prisma conflicts.
  [`route.ts:97`](../../apps/web/src/app/api/admin/roles/route.ts#L97)

- Role update protects the canonical Admin role name.
  [`route.ts:129`](../../apps/web/src/app/api/admin/roles/[roleId]/route.ts#L129)

- Role delete blocks Admin and uses conditional delete for usage races.
  [`route.ts:247`](../../apps/web/src/app/api/admin/roles/[roleId]/route.ts#L247)

**Tests**

- Create-route tests cover duplicate races and malformed JSON.
  [`admin-roles.unit.test.ts:135`](../../apps/web/src/app/api/admin/roles/admin-roles.unit.test.ts#L135)

- Detail-route tests cover Admin rename and conditional delete conflicts.
  [`admin-role-detail.unit.test.ts:52`](../../apps/web/src/app/api/admin/roles/[roleId]/admin-role-detail.unit.test.ts#L52)

- Auth tests cover database lookup failure behavior.
  [`admin-auth.unit.test.ts:81`](../../apps/web/src/lib/admin-auth.unit.test.ts#L81)
