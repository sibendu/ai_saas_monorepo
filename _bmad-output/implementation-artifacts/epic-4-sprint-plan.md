---
title: Epic 4 Sprint Plan - Admin Panel & Role Management
project: saas_monorepo
created: 2026-07-17
status: planned
source_epic: _bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md
tracking: _bmad-output/implementation-artifacts/sprint-status.yaml
---

# Epic 4 Sprint Plan: Admin Panel & Role Management

## Sprint Goal

Complete Epic 4 by extending the existing admin-only `/admin` area from role CRUD into full user, role assignment, role-module access, and admin audit logging workflows.

## Current State

- Story 4.1, Create `/admin` Layout & Role-Restricted Access: done.
- Story 4.2, Admin Panel - Role Management CRUD: done.
- Story 4.3 through Story 4.6 remain to complete Epic 4.
- Existing implementation anchor: `_bmad-output/implementation-artifacts/spec-4-1-4-2-admin-role-management.md`.

## Sprint Scope

### Story 4.3: Admin Panel - User Management

Deliverables:
- Add admin-only `GET /api/admin/users` and `PUT /api/admin/users/[userId]` routes.
- List users with email, name, company, and assigned roles.
- Allow admin edits for user name, company, and email.
- Validate required fields and email format.
- Add focused unit and integration coverage for authorization, validation, and persistence.

Exit criteria:
- Admin can list users and update editable user details.
- Non-admin users cannot access user management data or APIs.
- Updates persist through Prisma and return clear success or error responses.

### Story 4.4: Admin Panel - User-Role Assignment

Deliverables:
- Add admin-only `PUT /api/admin/users/[userId]/roles` route.
- Add checkbox or multi-select role assignment controls in the Users admin surface.
- Support assigning and unassigning multiple roles per user.
- Reuse existing `UserRole` and `Role` models without schema changes.
- Test duplicate role IDs, missing users, invalid role IDs, and non-admin access.

Exit criteria:
- Admin can update a user's role set in one save action.
- Assignment changes persist and are reflected in the user list.
- User permissions update on next login or cache refresh.

### Story 4.5: Admin Panel - Role-Module Mapping

Deliverables:
- Add admin-only `PUT /api/admin/roles/[roleId]/modules` route.
- Load modules and sub-modules in the Roles or Modules admin tab.
- Render two-level module/sub-module checkboxes.
- Persist role-module grants and revocations through the existing `RoleModule` model.
- Preserve the two-level permission model and avoid recursive permission trees.

Exit criteria:
- Admin can see and update module access for each role.
- Persisted mappings drive the existing role-based menu filtering.
- Invalid module, sub-module, and role IDs return clear errors.

### Story 4.6: Admin Panel - Audit Trail Logging

Deliverables:
- Add a small server-side admin audit helper shared by admin API routes.
- Log role, user, user-role, and role-module mutations with timestamp, actor, action, and target entity.
- Keep Phase 1 logging console-based unless a schema change is explicitly approved.
- Ensure logs redact secrets, tokens, and sensitive request payloads.
- Add tests around audit helper call points where practical.

Exit criteria:
- All mutating admin endpoints log a structured audit event.
- Audit entries identify who performed the action and what changed.
- No credentials, reset tokens, or session tokens are logged.

## Execution Order

1. Implement Story 4.3 first because it creates the user data surface needed by role assignment.
2. Implement Story 4.4 next because it depends on user and role listing.
3. Implement Story 4.5 after role CRUD and module seed data are confirmed usable.
4. Implement Story 4.6 last so the audit helper can be attached to every mutating endpoint consistently.
5. Run Epic 4 regression verification across admin auth, role CRUD, user management, role assignment, and module mapping.

## Verification Plan

- `npm.cmd run type-check --workspace=apps/web`
- `npm.cmd run test:unit --workspace=apps/web`
- `npm.cmd run test:integration --workspace=apps/web`
- Manual admin smoke path:
  - Admin user can open `/admin`.
  - Non-admin user is redirected from `/admin`.
  - Admin can list and edit users.
  - Admin can assign and remove user roles.
  - Admin can grant and revoke role module access.
  - Updated role-module mappings are reflected in the app menu after login or cache refresh.

## Definition of Done

- Stories 4.3, 4.4, 4.5, and 4.6 are implemented, reviewed, and verified.
- `sprint-status.yaml` marks all Epic 4 stories as `done`.
- Epic 4 retrospective remains optional but available as `epic-4-retrospective`.
