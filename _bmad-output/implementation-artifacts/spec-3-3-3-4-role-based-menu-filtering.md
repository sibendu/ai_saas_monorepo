---
title: 'Stories 3.3 and 3.4: role-based menu filtering'
type: 'feature'
created: '2026-07-12'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'd06600d1371dea17ed741eae5ed2990af55d6c91'
context:
  - '{project-root}/docs/project-context.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** Epic 3 has persisted role/module data, but the runtime menu is still hardcoded and the BFF does not expose the authenticated user's role-derived menu structure. Users therefore see the same sidebar regardless of role assignments.

**Approach:** Add a BFF role lookup endpoint that accepts a user email, resolves assigned roles and role-module grants from Prisma, and returns a compact menu response. Add a web server helper that calls the BFF during protected page rendering and passes the allowed menu to `AppShell` so the existing responsive sidebar renders only authorized modules and sub-modules.

## Boundaries & Constraints

**Always:** Preserve existing protected-page session checks; keep the AppShell mobile/sidebar interactions; return only role-granted modules/sub-modules; use existing BFF URL env handling.

**Ask First:** Changing auth provider/session behavior, resetting database state, replacing the AppShell layout, or changing the Story 3.1/3.2 schema.

**Never:** Trust client-side filtering as the source of truth, expose inaccessible module grants in the web payload, or hardcode role names in the menu renderer.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Role-assigned user | BFF receives `GET /api/user/roles?email=sales@example.com` | Response contains the user's roles and only modules/sub-modules granted through those roles | N/A |
| Missing email | BFF receives request without a usable email | Endpoint returns 400 with `success: false` | Message identifies that `email` is required |
| No matching user | Email has no customer row | Endpoint returns empty roles/modules with `success: true` | Does not leak whether auth is valid beyond the provided lookup result |
| Menu fetch failure | Protected page cannot reach BFF | Page still renders with fallback navigation | Error is logged server-side |

</frozen-after-approval>

## Code Map

- `apps/bff/src/lib/prisma.ts` -- BFF Prisma client for role/menu queries.
- `apps/bff/src/routes/roles.ts` -- new `GET /api/user/roles` endpoint.
- `apps/bff/src/index.ts` -- mounts the role route.
- `apps/web/src/lib/role-menu.ts` -- server helper for loading the current user's allowed menu.
- `apps/web/src/components/AppShell.tsx` -- renders caller-provided menu sections with static fallback.
- `apps/web/src/app/*/page.tsx` and `apps/web/src/app/preferences/PreferencesForm.tsx` -- pass role-filtered menu into protected shells.
- `packages/shared-types/src/index.ts` -- shared response and allowed-menu interfaces.

## Tasks & Acceptance

**Execution:**
- [x] `packages/shared-types/src/index.ts` -- add role/menu response interfaces shared by BFF and web.
- [x] `apps/bff/package.json`, `apps/bff/src/lib/prisma.ts`, `apps/bff/src/routes/roles.ts`, `apps/bff/src/index.ts` -- add Prisma-backed role endpoint and mount it.
- [x] `apps/web/src/lib/role-menu.ts` -- add authenticated server helper that fetches role-filtered menu from the BFF with fallback navigation.
- [x] `apps/web/src/components/AppShell.tsx` and protected pages/forms -- accept and render dynamic menu sections.
- [x] `apps/bff/src/tests` and `apps/web/src/tests` -- cover endpoint validation/mapping and AppShell dynamic filtering behavior.

**Acceptance Criteria:**
- Given a seeded user has role-module mappings, when the web app renders a protected page, then the sidebar contains only modules and sub-modules returned by the BFF for that user.
- Given a user has no matching role mappings or the BFF fetch fails, when the web app renders a protected page, then it still renders a usable fallback menu.
- Given `GET /api/user/roles` is called without `email`, when the BFF handles the request, then it returns a 400 response with a clear error.
- Given the allowed menu includes nested sub-modules, when the user expands/collapses sections, then the existing active item and responsive sidebar behavior still works.

## Spec Change Log

## Design Notes

The BFF query uses email as the lookup key because the existing NextAuth session consistently carries `session.user.email`, while OAuth-created sessions may not always have a stable `uid` populated until callbacks refresh.

## Verification

**Commands:**
- `npm run type-check` -- passed.
- `npm run test:unit --workspace=apps/web` -- passed.
- `npm run test:unit --workspace=apps/bff` -- passed.
- `npm run db:generate` -- passed when rerun manually.
- `npm run db:migrate` -- passed when rerun manually; DB verified.

**Notes:**
- Manual Prisma generation and migration verification completed after the earlier Windows file-lock issue.

## Suggested Review Order

**BFF Role Resolution**

- Endpoint boundary validates email and returns role-filtered menu data.
  [`roles.ts:81`](../../apps/bff/src/routes/roles.ts#L81)

- Deduplication keeps multi-role grants from duplicating modules or children.
  [`roles.ts:36`](../../apps/bff/src/routes/roles.ts#L36)

**Web Menu Binding**

- Server helper loads authenticated menu data with static fallback.
  [`role-menu.ts:69`](../../apps/web/src/lib/role-menu.ts#L69)

- Mapper converts allowed modules into AppShell-compatible sections.
  [`role-menu.ts:19`](../../apps/web/src/lib/role-menu.ts#L19)

- AppShell renders provided sections while preserving fallback navigation.
  [`AppShell.tsx:96`](../../apps/web/src/components/AppShell.tsx#L96)

- Protected pages pass the role-filtered menu into the shell.
  [`dashboard/page.tsx:31`](../../apps/web/src/app/dashboard/page.tsx#L31)

**Contracts And Tests**

- Shared response types define the BFF/web menu contract.
  [`index.ts:40`](../../packages/shared-types/src/index.ts#L40)

- BFF route tests cover validation, mapping, and deduplication.
  [`roles.unit.test.ts:1`](../../apps/bff/src/tests/unit/roles.unit.test.ts#L1)

- AppShell test proves dynamic sections replace static fallback items.
  [`AppShell.unit.test.tsx:55`](../../apps/web/src/tests/unit/AppShell.unit.test.tsx#L55)
