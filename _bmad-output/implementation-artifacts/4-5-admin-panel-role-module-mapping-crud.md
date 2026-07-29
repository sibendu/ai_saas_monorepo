---
baseline_commit: 6c78e9892880416dbe22b3b518d623db9c4ca4af
---

# Story 4.5: Admin Panel - Role-Module Mapping CRUD

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an admin,
I want to manage which modules and sub-modules each role can access from the admin panel,
so that menu permissions can be changed without editing seed data or the database directly.

## Acceptance Criteria

1. Given a signed-in user with the `Admin` role, when they open `/admin`, then the Modules tab is enabled and shows roles plus the available modules and sub-modules in the existing two-level hierarchy.
2. Given a signed-in user without the `Admin` role, when they visit `/admin` or call any role-module mapping endpoint, then no mapping data or mutation capability is exposed and the request is redirected or rejected with existing admin authorization behavior.
3. Given an admin selects a role, when the Modules tab loads that role, then module and sub-module checkboxes reflect the role's persisted `role_module` rows.
4. Given an admin checks a module and saves, when the update succeeds, then a role-level `RoleModule` row exists for that role and module with `subModuleId: null`.
5. Given an admin checks sub-modules and saves, when the update succeeds, then `RoleModule` rows exist for exactly those `(roleId, moduleId, subModuleId)` grants and each selected sub-module belongs to its submitted parent module.
6. Given an admin unchecks modules or sub-modules and saves, when the update succeeds, then removed grants are deleted from PostgreSQL and no stale role-module rows remain for that role.
7. Given an admin saves an empty module selection for a non-Admin role, when the update succeeds, then all module access is removed for that role and users with only that role do not see revoked default modules on next server-side menu load.
8. Given the update would remove all module access from the canonical `Admin` role, when the API runs, then it returns `409` and preserves the existing Admin role mappings.
9. Given the role id is invalid or stale, when the mapping API runs, then it returns `400 Invalid role id` for invalid ids or `404 Role not found` for missing roles.
10. Given the request body is malformed, missing `moduleIds` or `subModuleIds`, contains duplicate ids, non-positive ids, unknown module/sub-module ids, or mismatched sub-module parents, when the API runs, then it returns `400` and preserves existing mappings.
11. Given role-module mappings change, when a user with that role next triggers server-side menu loading through navigation, refresh, or next login, then the BFF role-menu response and AppShell menu reflect the updated access without code changes.
12. Given the mapping endpoint logs the action, when logs are written, then they include actor, role id, module ids, and sub-module ids only; passwords, reset tokens, session tokens, OAuth internals, and raw request bodies are never logged.

## Tasks / Subtasks

- [ ] Add shared admin module/mapping DTOs in `packages/shared-types/src/index.ts` (AC: 1, 3-6, 10)
  - [ ] Add `AdminSubModuleSummary` with `id`, `moduleId`, `label`, `icon`, and `href`.
  - [ ] Add `AdminModuleSummary` with `id`, `label`, `icon`, `href`, and `subModules`.
  - [ ] Add `AdminModulesData` with `modules: AdminModuleSummary[]`.
  - [ ] Add `AdminRoleModuleMappingData` with `roleId`, `moduleIds`, and `subModuleIds`.
  - [ ] Add `AdminRoleModuleMappingRequest` with `moduleIds: string[]` and `subModuleIds: string[]`.
  - [ ] Keep existing public `AllowedModule`, `RoleModule`, user-role DTOs, and `ApiResponse<T>` contracts compatible.

- [ ] Add reusable admin module mapping helpers under `apps/web/src/lib/admin-modules.ts` (AC: 1, 3-6, 10, 11)
  - [ ] Define a `moduleWithSubModulesSelect`/mapper that returns sorted module summaries without leaking unrelated database fields.
  - [ ] Define a role mapping mapper that returns selected top-level module ids and selected sub-module ids as strings.
  - [ ] Reuse these helpers from page data loading, API routes, and tests instead of duplicating shape conversion.
  - [ ] Preserve the existing two-level model; do not introduce recursive tree logic.

- [ ] Add admin-only module list API at `apps/web/src/app/api/admin/modules/route.ts` (AC: 1, 2)
  - [ ] Reuse `getAdminAuthorization()` before querying module data.
  - [ ] Query `prisma.module.findMany` ordered by label and include `subModules` ordered by label.
  - [ ] Return `ApiResponse<AdminModulesData>` with module and sub-module ids converted to strings.
  - [ ] Do not create, edit, or delete modules in this story; seed data remains the module source.

- [ ] Add role mapping read/update API at `apps/web/src/app/api/admin/roles/[roleId]/modules/route.ts` (AC: 2-12)
  - [ ] Type route context as `params: Promise<{ roleId: string }>` and `await context.params`, matching existing dynamic admin routes.
  - [ ] Implement `GET` for one role's current mapping so the UI can refresh stale selections.
  - [ ] Implement `PUT` to replace mappings for one role.
  - [ ] Parse `roleId` as a positive safe integer and return `400 Invalid role id` for bad values.
  - [ ] Read JSON defensively and return `400 Invalid JSON request body` for malformed bodies.
  - [ ] Validate `moduleIds` and `subModuleIds` are arrays of unique positive integer strings; return `400` before DB mutation for invalid or duplicate ids.
  - [ ] Verify the role exists; return `404 Role not found` when stale.
  - [ ] Verify all submitted modules exist; return `400 One or more modules were not found` for unknown modules.
  - [ ] Verify all submitted sub-modules exist and belong to modules in the submitted module set; return `400 One or more sub-modules were not found` or `400 Sub-module does not belong to a selected module`.
  - [ ] Guard the canonical `Admin` role: reject an empty final mapping with `409 Admin role must retain module access`.
  - [ ] Replace rows in a single Prisma transaction: delete existing `roleModule` rows for `roleId`, create one top-level row for each selected module, then create one row for each selected sub-module using its real `moduleId`.
  - [ ] Return `200` with `ApiResponse<AdminRoleModuleMappingData>` and message `Role module access updated successfully`.
  - [ ] Log a minimal event with `actorEmail`, `roleId`, normalized `moduleIds`, and normalized `subModuleIds`.

- [ ] Enable and implement the Modules tab in `apps/web/src/components/admin/AdminManagementTabs.tsx` (AC: 1, 3-7)
  - [ ] Extend tab state to include `modules`.
  - [ ] Replace the disabled Modules button with an enabled tab button.
  - [ ] Pass `initialRoles` and module data into a new `RoleModuleManagement` component.
  - [ ] Preserve existing Roles and Users tab behavior, including Story 4.4 role assignment props.

- [ ] Load initial module data in `apps/web/src/app/admin/page.tsx` (AC: 1, 3)
  - [ ] Keep `requireAdminSession()` before all role/user/module queries.
  - [ ] Load roles, users, and modules with `Promise.all` after authorization.
  - [ ] Preserve `AppShell`, `getAuthenticatedShellData()`, page title/subtitle, and existing role/user data loading.
  - [ ] Do not call the BFF from the admin page for module CRUD; existing admin APIs use Prisma in the web app.

- [ ] Add `apps/web/src/components/admin/RoleModuleManagement.tsx` (AC: 1, 3-8, 10, 11)
  - [ ] Use a compact admin panel style consistent with `RoleManagement` and `UserManagement`.
  - [ ] Provide a role selector or role rows so admins can choose the role being mapped.
  - [ ] Render module checkboxes with nested sub-module checkboxes. Checkboxes are the expected control because access is binary and visible.
  - [ ] Initialize selection from the selected role's existing mappings by calling `GET /api/admin/roles/${roleId}/modules` or by accepting preloaded mapping data if the implementation adds it server-side.
  - [ ] When a sub-module is checked, ensure its parent module is included in the saved `moduleIds`.
  - [ ] When a module is unchecked, clear its sub-module selections in UI state before save.
  - [ ] Save with `PUT /api/admin/roles/${roleId}/modules` and `{ moduleIds, subModuleIds }`.
  - [ ] On success, update local selected mapping state and refresh or update role `moduleCount` so the Roles tab stays truthful.
  - [ ] On failure, keep the edited selection visible and show the API error without claiming persistence.
  - [ ] Show clear empty states for no roles and no modules; do not invent modules client-side.

- [ ] Add focused tests (AC: 1-12)
  - [ ] Unit-test `GET /api/admin/modules`: denies non-admin, returns sorted modules with nested sub-modules, and omits unrelated fields.
  - [ ] Unit-test `GET /api/admin/roles/[roleId]/modules`: denies non-admin, invalid role id, missing role, empty mappings, and populated mappings.
  - [ ] Unit-test `PUT /api/admin/roles/[roleId]/modules`: malformed JSON, missing/non-array fields, invalid ids, duplicate ids, unknown modules, unknown sub-modules, sub-module parent mismatch, missing role, Admin empty-mapping conflict, empty non-Admin success, and mixed module/sub-module success.
  - [ ] Assert successful `PUT` uses a Prisma transaction and returns normalized mapping ids.
  - [ ] Component-test `AdminManagementTabs`: Modules tab is enabled and preserves Roles/Users behavior.
  - [ ] Component-test `RoleModuleManagement`: renders hierarchy, loads existing selection, checks/unchecks parents and children, saves changed mappings, clears a non-Admin role, shows validation/conflict errors, and keeps edited state after failures.
  - [ ] Unit-test `getAllowedMenuSections`: a successful BFF response with `modules: []` returns an empty role-driven menu instead of the hardcoded default menu.
  - [ ] Update BFF `roles.unit.test.ts` only if mapping response assumptions need an explicit regression test for changed role-module semantics.

## Dev Notes

### Current State

- Story 4.1 and 4.2 established the protected `/admin` page, `getAdminAuthorization()`, role CRUD APIs, `RoleManagement`, and the Admin nav link.
- Story 4.3 is in `review` and added the Users tab, safe user DTOs, `adminUserSelect`, `mapAdminUser`, and profile edit APIs.
- Story 4.4 is in `review` and its implementation files are present in the dirty worktree. Treat those files as current baseline for this story: `AdminManagementTabs` passes `availableRoles` into `UserManagement`, and `PUT /api/admin/users/[userId]/roles` replaces `user_role` rows transactionally.
- The Modules tab currently exists as a disabled button in `AdminManagementTabs`; Story 4.5 owns making it functional.
- Module and sub-module records already exist through Prisma schema and seed data. This story maps roles to those existing modules; it does not add module CRUD.
- Runtime menu access is resolved by the BFF `GET /api/user/roles`, which reads `userRole -> role -> modules -> module/subModule`, deduplicates by module and sub-module id, and returns `AllowedModule[]`. Updating `role_module` rows is enough for the next server-side role-menu fetch to see permission changes.
- Current `apps/web/src/lib/role-menu.ts` falls back to hardcoded `menuSections` when the BFF response maps to an empty allowed-module list. That fallback is acceptable for fetch failures, but not for a successful permission response with no allowed modules. Story 4.5 must fix this or permission removal can still display default modules.

### Files To Update

- `packages/shared-types/src/index.ts`
  - Current state: has public role/menu types plus admin role and user DTOs from Stories 4.2-4.4.
  - Change: add admin module summaries and role-module mapping request/response DTOs near existing admin DTOs.
  - Preserve: existing public `Role`, `Module`, `SubModule`, `AllowedModule`, `UserRolesResponse`, and `ApiResponse<T>` shapes.

- `apps/web/src/app/admin/page.tsx`
  - Current state: requires admin access, loads shell data, roles, and users, then renders `AdminManagementTabs`.
  - Change: load initial module summaries after authorization and pass them into tabs.
  - Preserve: server-side admin gate before all queries, AppShell wiring, and existing role/user fetch behavior.

- `apps/web/src/components/admin/AdminManagementTabs.tsx`
  - Current state: client component with `roles` and `users` tabs; Modules button is disabled.
  - Change: add `modules` tab state, render `RoleModuleManagement`, and pass initial module data.
  - Preserve: role-management and user-management props/behavior, especially Story 4.4 `availableRoles` flow.

- `apps/web/src/components/admin/RoleManagement.tsx`
  - Current state: owns role create/edit/delete state and displays `moduleCount`.
  - Change: avoid direct edits unless needed to refresh module counts after mapping saves.
  - Preserve: role CRUD behavior, canonical Admin role protections in API, and existing messages.

- `apps/web/src/components/admin/UserManagement.tsx`
  - Current state: owns profile edit and user-role assignment controls.
  - Change: none expected.
  - Preserve: role assignment controls and independent save flows from Story 4.4.

- `apps/web/src/app/api/admin/modules/route.ts`
  - Current state: new file expected.
  - Change: add admin-only module hierarchy list endpoint.

- `apps/web/src/app/api/admin/roles/[roleId]/modules/route.ts`
  - Current state: new file expected.
  - Change: add admin-only role-module mapping read/update endpoint.

- `apps/web/src/lib/admin-modules.ts`
  - Current state: new file expected.
  - Change: add select objects, mapping helpers, and id normalization helpers if useful.

- `apps/web/prisma/schema.prisma`
  - Current state: `RoleModule` has `roleId`, `moduleId`, optional `subModuleId`, indexes on `[roleId, moduleId]` and `[subModuleId]`, and cascading relations.
  - Change: none expected.
  - Preserve: no schema or migration changes unless implementation discovers a concrete uniqueness bug that cannot be handled in application validation. If that happens, stop and renegotiate because adding a unique constraint may require data cleanup.

- `apps/bff/src/routes/roles.ts`
  - Current state: reads `role.modules` and maps them into menu modules/sub-modules.
  - Change: none expected.
  - Preserve: deduplication behavior and `UserRolesResponse` shape.

- `apps/web/src/lib/role-menu.ts`
  - Current state: maps BFF `AllowedModule[]` into AppShell sections, but returns hardcoded defaults when the mapped result is empty.
  - Change: return an empty menu for a successful BFF response with `success: true` and `modules: []`; keep default fallback only for missing email, fetch failure, non-OK response, invalid payload, or exhausted BFF URLs.
  - Preserve: Admin nav injection through `withAdminMenuSection()` for admins.

### Data Contracts

Recommended shared types:

```ts
export interface AdminSubModuleSummary {
  id: string
  moduleId: string
  label: string
  icon?: string | null
  href: string
}

export interface AdminModuleSummary {
  id: string
  label: string
  icon?: string | null
  href?: string | null
  subModules: AdminSubModuleSummary[]
}

export interface AdminModulesData {
  modules: AdminModuleSummary[]
}

export interface AdminRoleModuleMappingData {
  roleId: string
  moduleIds: string[]
  subModuleIds: string[]
}

export interface AdminRoleModuleMappingRequest {
  moduleIds: string[]
  subModuleIds: string[]
}
```

Endpoint shapes:

- `GET /api/admin/modules`
  - Success: `{ success: true, data: { modules } }`.
  - Errors: existing `getAdminAuthorization()` `401`, `403`, or `500`; unexpected errors return `500 Failed to fetch modules`.

- `GET /api/admin/roles/[roleId]/modules`
  - Success: `{ success: true, data: { roleId, moduleIds, subModuleIds } }`.
  - Errors: `400 Invalid role id`, `404 Role not found`, authorization errors, or `500 Failed to fetch role module access`.

- `PUT /api/admin/roles/[roleId]/modules`
  - Request: `{ moduleIds: string[], subModuleIds: string[] }`.
  - Success: `{ success: true, data: { roleId, moduleIds, subModuleIds }, message: 'Role module access updated successfully' }`.
  - Errors:
    - `401 Unauthorized` or `403 Admin access required`.
    - `400 Invalid role id`.
    - `400 Invalid JSON request body`.
    - `400 moduleIds must be an array`.
    - `400 subModuleIds must be an array`.
    - `400 Module ids must be unique positive integers`.
    - `400 Sub-module ids must be unique positive integers`.
    - `400 One or more modules were not found`.
    - `400 One or more sub-modules were not found`.
    - `400 Sub-module does not belong to a selected module`.
    - `404 Role not found`.
    - `409 Admin role must retain module access`.
    - `500 Failed to update role module access`.

### Persistence Rules

- Use `prisma.roleModule`, not role updates with nested writes, so replacement semantics are explicit and easy to test.
- Normalize submitted ids once and use normalized numeric arrays throughout the endpoint.
- Persist one row per selected top-level module using `subModuleId: null`.
- Persist one row per selected sub-module using the sub-module's actual `moduleId`.
- If a sub-module is selected, require its parent module to be selected. The UI may auto-select the parent, but the API must still validate this server-side.
- Deleting all mappings is valid for non-Admin roles. It is not valid for the canonical `Admin` role because it can remove admin visibility and make future recovery harder.
- Use a transaction so partial writes cannot leave a role with half-applied permissions:

```ts
await prisma.$transaction(async (tx) => {
  await tx.roleModule.deleteMany({ where: { roleId } })

  if (moduleIds.length > 0 || subModuleIds.length > 0) {
    await tx.roleModule.createMany({
      data: [
        ...moduleIds.map((moduleId) => ({ roleId, moduleId, subModuleId: null })),
        ...selectedSubModules.map((subModule) => ({
          roleId,
          moduleId: subModule.moduleId,
          subModuleId: subModule.id,
        })),
      ],
    })
  }
})
```

- Because the current Prisma schema does not define a uniqueness constraint on `RoleModule`, validate and deduplicate in application code before `createMany`.
- After successful mutation, fetch the mapping again or return normalized submitted ids. If the UI updates role `moduleCount`, count distinct selected modules rather than raw rows.
- After changing role-menu fallback semantics, ensure admin users still receive the Admin navigation section through `getAuthenticatedShellData()` even if their database role-module mappings are temporarily empty.

### UX Guidance

- Keep the admin UI compact, table-oriented, and consistent with `RoleManagement` and `UserManagement`.
- Use checkbox controls for module grants and nested checkbox controls for sub-module grants. Access is binary and should be visible at a glance.
- Use stable row/panel dimensions and avoid row jumps while mapping data loads or saves.
- Prefer a single selected-role editor in the Modules tab if showing every role's full module tree at once becomes too dense.
- Show module labels and sub-module labels from database data only. Do not hardcode the seed module list into React components.
- A module checkbox represents top-level access. Sub-module checkboxes represent nested access. The UI should make it clear when a module has no sub-modules.
- Keep save state scoped to the selected role. Saving module access must not block role CRUD or user-role assignment in other tabs.
- On save failure, leave the admin's edited checkbox state visible and show the server error.
- On save success, show a clear success message and refresh the selected role mapping before the admin makes another edit.

### Architecture Compliance

- Keep Story 4.5 admin module mapping in Next.js web API routes with Prisma, matching Stories 4.2-4.4. Do not add BFF admin routes for this story.
- Authorization is server-side. Client-side tab visibility is not security.
- The BFF remains private and continues to expose only the existing role-menu read endpoint.
- A successful empty role-menu response must not fall back to hardcoded default modules. Keep hardcoded defaults only as a resilience fallback when BFF role-menu loading fails.
- Preserve two-level module nesting. Do not add recursive permission trees, page-level ACLs, tenant ACLs, or route authorization for individual module pages in this story.
- Do not add dependencies, state libraries, schema migrations, or a separate admin detail route unless implementation proves the current `/admin` tab cannot support the workflow.
- Use Prisma parameterized operations only; no raw SQL.
- Do not log passwords, reset tokens, session tokens, OAuth provider internals, raw request bodies, or full customer records.

### Previous Story Intelligence

- Story 4.4 added:
  - `apps/web/src/app/api/admin/users/[userId]/roles/route.ts`
  - `apps/web/src/components/admin/UserManagement.tsx`
  - `apps/web/src/components/admin/AdminManagementTabs.tsx`
  - `AdminUserRoleAssignmentRequest`
  - focused API/component tests.
- Continue the Story 4.4 pattern for assignment endpoints: authorize first, parse dynamic params with `await context.params`, validate JSON and ids before writes, use one transaction for replacement, and return shared DTOs.
- Story 4.4 is still `review` in sprint status and files are currently uncommitted in this checkout. Verify current files before implementation and avoid overwriting review changes.
- Story 4.3 and 4.4 verification used `npm.cmd` on Windows because PowerShell can block `npm.ps1`.
- Story 4.2 role delete already blocks roles with module mappings through `_count.modules`; after Story 4.5 assigns module access, this guard should remain true.

### Git Intelligence

- Current baseline commit for this story file is `6c78e98` (`deleted apps\web\.next - it need not be git tracked`).
- Recent git history in this checkout does not show committed Story 4.3/4.4 implementation changes, so rely on the working tree files and previous story records for current admin patterns.
- The worktree already has unrelated or prior-story modifications including `.gitignore`, report files, admin user files, shared types, and Story 4.4 artifacts. Do not revert them while implementing Story 4.5.

### Latest Technical Notes

- Project dependencies are locked in `apps/web/package.json`: Next.js `^16.1.6`, NextAuth `^4.24.5`, Prisma `6.19.2`, React `18.2.0`, Vitest `4.0.18`, Testing Library `16.3.2`, and `@testing-library/user-event` `14.6.1`.
- Do not upgrade dependencies for this story.
- Current Next.js docs show App Router dynamic `params` as asynchronous for dynamic routes; follow the existing project pattern with `params: Promise<...>` and `await context.params`.
- Current Next.js route handler docs support `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS` exports from `route.ts`; implement only the methods needed here.
- Prisma transaction docs support interactive `$transaction` and bulk operations such as `deleteMany`/`createMany`; use the transaction client consistently inside the transaction callback.
- Testing Library user-event v14 docs recommend creating a user-event instance with `userEvent.setup()` for interaction tests; follow existing component test patterns.

## References

- [Source: docs/project-context.md](../../docs/project-context.md) - stack, coding rules, scan boundaries, and verification commands.
- [Source: _bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md](../planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md) - Epic 4 and Story 4.5 requirements.
- [Source: _bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md](../planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md) - FR.03.03, FR.03.04, FR.04.05, and admin user journey.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md](../planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md) - AD-06 and AD-09 role/module/admin rules.
- [Source: _bmad-output/implementation-artifacts/epic-4-context.md](./epic-4-context.md) - compiled Epic 4 constraints and cross-story dependencies.
- [Source: _bmad-output/implementation-artifacts/spec-4-1-4-2-admin-role-management.md](./spec-4-1-4-2-admin-role-management.md) - admin authorization and role CRUD baseline.
- [Source: _bmad-output/implementation-artifacts/4-3-admin-panel-user-management-list-edit-view-roles.md](./4-3-admin-panel-user-management-list-edit-view-roles.md) - previous Users tab and admin user API patterns.
- [Source: _bmad-output/implementation-artifacts/4-4-admin-panel-user-role-assignment-many-to-many.md](./4-4-admin-panel-user-role-assignment-many-to-many.md) - previous user-role assignment API and UI patterns.
- [Source: apps/web/prisma/schema.prisma](../../apps/web/prisma/schema.prisma) - `Role`, `Module`, `SubModule`, and `RoleModule` schema.
- [Source: apps/web/prisma/seed.js](../../apps/web/prisma/seed.js) - current seeded roles, modules, sub-modules, and role-module mappings.
- [Source: apps/web/src/app/admin/page.tsx](../../apps/web/src/app/admin/page.tsx) - current admin page data loading and AppShell wiring.
- [Source: apps/web/src/components/admin/AdminManagementTabs.tsx](../../apps/web/src/components/admin/AdminManagementTabs.tsx) - tab composition to extend.
- [Source: apps/web/src/components/admin/RoleManagement.tsx](../../apps/web/src/components/admin/RoleManagement.tsx) - role-management UI and API response pattern.
- [Source: apps/web/src/components/admin/UserManagement.tsx](../../apps/web/src/components/admin/UserManagement.tsx) - Story 4.4 checkbox/save pattern for many-to-many assignments.
- [Source: apps/web/src/lib/admin-auth.ts](../../apps/web/src/lib/admin-auth.ts) - admin authorization helper.
- [Source: apps/web/src/lib/admin-users.ts](../../apps/web/src/lib/admin-users.ts) - mapper/select pattern to mirror for module DTOs.
- [Source: apps/web/src/lib/role-menu.ts](../../apps/web/src/lib/role-menu.ts) - menu fallback behavior that must distinguish successful empty permissions from fetch failures.
- [Source: apps/web/src/app/api/admin/roles/route.ts](../../apps/web/src/app/api/admin/roles/route.ts) - admin list/create API pattern.
- [Source: apps/web/src/app/api/admin/roles/[roleId]/route.ts](../../apps/web/src/app/api/admin/roles/[roleId]/route.ts) - dynamic route and guarded delete pattern.
- [Source: apps/web/src/app/api/admin/users/[userId]/roles/route.ts](../../apps/web/src/app/api/admin/users/[userId]/roles/route.ts) - replacement transaction pattern from Story 4.4.
- [Source: apps/bff/src/routes/roles.ts](../../apps/bff/src/routes/roles.ts) - menu permission read path that must reflect new mappings.
- [External: Next.js Dynamic Routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) - async dynamic route params convention.
- [External: Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) - App Router route handler methods.
- [External: Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) - transaction API for atomic replacement.
- [External: Prisma CRUD](https://www.prisma.io/docs/orm/prisma-client/queries/crud) - `deleteMany`/`createMany` behavior.
- [External: Testing Library user-event v14](https://testing-library.com/docs/user-event/intro/) - current interaction testing guidance.

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-07-29: Created Story 4.5 context for admin role-module mapping CRUD and set status to ready-for-dev.
