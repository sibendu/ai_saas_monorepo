# Epic 4 Context: Admin Panel & Role Management

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Build a role-restricted `/admin` area where users with the `admin` role can manage roles, users, user-role assignments, and role-to-module access mappings. The epic completes the configuration-driven access-control loop: admins can update permissions without code changes, and those changes control which modules and sub-modules users can access in the app menu.

## Stories

- Story 4.1: Create /admin Layout & Role-Restricted Access
- Story 4.2: Admin Panel - Role Management (CRUD)
- Story 4.3: Admin Panel - User Management (List, Edit, View Roles)
- Story 4.4: Admin Panel - User-Role Assignment (Many-to-Many)
- Story 4.5: Admin Panel - Role-Module Mapping (CRUD)
- Story 4.6: Admin Panel - Audit Trail Logging

## Requirements & Constraints

- `/admin` is accessible only to users assigned the `admin` role; non-admin users must be redirected to `/dashboard` or rejected before admin UI or actions are exposed.
- Admin UI must provide tabs or equivalent navigation for Roles, Users, and Modules.
- Role management must support listing, creating, editing, and deleting roles. Role names are required, non-empty, and unique; descriptions are editable.
- User management must list users with email, name, company, and assigned roles; admins can edit user details with required-field and email-format validation.
- User-role assignment must support multiple roles per user and allow assigning and unassigning roles.
- Role-module mapping must let admins grant or revoke access to modules and sub-modules using the existing two-level menu model.
- Admin changes must persist to PostgreSQL and affect menu permissions on the next login or cache refresh.
- All admin actions must be logged with timestamp, actor, action, and target entity. Minimal Phase 1 logging may be console-based; a database audit table is deferred unless needed.
- Relevant non-functional constraints: API responses should stay under normal 200ms targets, database lookups should be indexed and target under 50ms, Prisma must be used for SQL injection prevention, and sensitive data must not be logged.

## Technical Decisions

- Stack and boundaries are locked: Next.js web app owns authentication and presentation; Express BFF owns business logic and data where logic is moved there; both use shared TypeScript types.
- Authorization must be enforced server-side. Page load uses `getServerSession()` and verifies the `admin` role before rendering; admin API routes must reject non-admin sessions.
- Existing role-based access model is locked: `Customer`, `Role`, `Module`, `SubModule`, `RoleModule`, and `UserRole` backed by Prisma/PostgreSQL.
- Permission nesting is limited to two levels: modules and sub-modules. Do not introduce recursive or deeper permission trees for Phase 1.
- One user can have multiple roles. One role can map to multiple modules and sub-modules through `role_module`.
- API responses should follow the shared `ApiResponse<T>` wrapper convention where applicable.
- Candidate implementation locations from planning: `apps/web/src/app/admin/page.tsx`, `apps/web/src/app/api/admin/roles/route.ts`, `apps/web/src/app/api/admin/users/route.ts`, nested routes for user-role and role-module updates, and optionally `apps/bff/src/routes/admin.ts` if admin business logic moves to the BFF.
- The BFF remains private and trusted by the web app. Do not expose BFF admin routes publicly.
- Sessions are JWT-only with 30-day expiry; immediate token revocation is out of scope for Phase 1.

## UX & Interaction Patterns

- Admin experience centers on `/admin` with clear tab navigation for Roles, Users, and Modules.
- Role CRUD should present list rows with name, description, and action controls for edit/delete.
- User management should show assigned roles directly in the users list or detail view.
- User-role assignment should use checkboxes or a multi-select so admins can assign multiple roles at once.
- Role-module mapping should use checkboxes for each module and its sub-modules, preserving the two-level hierarchy.
- Error messages must be clear and user-friendly for validation failures and failed admin actions.
- The `/admin` link should be hidden from non-admin users client-side, but server-side authorization remains required.

## Cross-Story Dependencies

- Story 4.1 gates all later stories because every admin UI and API path depends on verified admin access.
- Stories 4.2 and 4.3 provide the role and user data needed by Story 4.4.
- Story 4.2 and the existing module/sub-module data model are prerequisites for Story 4.5.
- Story 4.6 depends on all mutating admin endpoints so each create, update, delete, assignment, and mapping change can be logged consistently.
- Epic 4 depends on the Epic 3 role/module schema, seed data, and role-resolution behavior already being in place.
