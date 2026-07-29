---
title: 'Story 3.5: implement top-horizontal menu layout config-driven'
type: 'feature'
created: '2026-07-12'
status: 'Completed'
review_loop_iteration: 0
baseline_commit: 'f90d89ee6ed53d4a8b7bc47ff377a0b5c5d320db'
context:
  - '{project-root}/docs/project-context.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** Epic 3 can now provide role-filtered menu sections, but the web shell still renders only the left sidebar layout. The product needs a config-driven top-horizontal menu option without losing existing role filtering, active state, or mobile navigation behavior.

**Approach:** Add a validated `MENU_LAYOUT=left|top` configuration path in the web app, create a `TopMenu` component that consumes the same `MenuSectionConfig[]`, and update `AppShell` to choose the layout at render time while preserving the current sidebar as the default fallback.

## Boundaries & Constraints

**Always:** Keep `left` as the default when config is missing or invalid; reuse the existing menu section contract from Story 3.3/3.4; preserve protected page session checks and existing `AppShell` props; keep active page highlighting for both layouts; support mobile hamburger navigation in the top layout.

**Ask First:** Changing role-menu BFF contracts, replacing the sidebar visual system, adding new runtime settings storage, or changing protected route composition.

**Never:** Hardcode role names or menu items into the top menu, make top layout client-side auth enforcement, or remove existing left-sidebar collapse/mobile behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Default layout | `MENU_LAYOUT` is missing or invalid | `AppShell` renders the existing left sidebar | Invalid values fall back to `left` |
| Top layout | `MENU_LAYOUT=top` | `AppShell` renders a top horizontal menu using provided role-filtered sections | N/A |
| Nested menu | Top layout receives sections with child items | Module labels display in the bar and reveal sub-module links on hover/focus | Empty sections are skipped |
| Mobile top layout | Top layout on small screens | Hamburger opens a vertical menu with the same allowed sections | Closing a link collapses the mobile menu |

</frozen-after-approval>

## Code Map

- `apps/web/src/config/navigation.ts` -- menu data types, UI classes, and new menu layout config reader.
- `apps/web/src/components/AppShell.tsx` -- shell chooser for left sidebar versus top menu layout.
- `apps/web/src/components/TopMenu.tsx` -- new horizontal/desktop and hamburger/mobile top menu renderer.
- `apps/web/src/tests/unit/AppShell.unit.test.tsx` -- verifies config-driven shell selection preserves fallback behavior.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/config/navigation.ts` -- add a `MenuLayout` type and config reader that validates `MENU_LAYOUT` and defaults to `left`.
- [x] `apps/web/src/components/TopMenu.tsx` -- render allowed menu sections horizontally with hover/focus dropdowns, mobile hamburger, active highlighting, and logout/user controls.
- [x] `apps/web/src/components/AppShell.tsx` -- delegate to `TopMenu` when config is `top` and keep the existing sidebar path unchanged for `left`.
- [x] `apps/web/src/tests/unit/AppShell.unit.test.tsx` -- cover default left layout, top layout selection, active/top menu rendering, and mobile menu behavior.

**Acceptance Criteria:**
- Given no `MENU_LAYOUT` is configured, when a protected page renders, then the existing left sidebar layout appears.
- Given `MENU_LAYOUT=top`, when a protected page renders, then menu modules appear horizontally and sub-modules are available from each module.
- Given the current route matches a sub-module href, when either layout renders, then the matching item is visually active.
- Given the viewport is mobile-sized in top layout, when the hamburger is clicked, then the allowed menu opens and link selection closes it.

## Spec Change Log

## Verification

**Commands:**
- `npm.cmd run type-check --workspace=apps/web` -- passed.
- `npm.cmd run test:unit --workspace=apps/web` -- passed.

**Notes:**
- PowerShell blocked `npm.ps1`, so verification used `npm.cmd` for the same npm scripts.

## Suggested Review Order

**Layout Selection**

- AppShell keeps sidebar default and delegates only the top layout.
  [`AppShell.tsx:130`](../../apps/web/src/components/AppShell.tsx#L130)

- Server shell data carries validated layout config with role-filtered menu data.
  [`role-menu.ts:74`](../../apps/web/src/lib/role-menu.ts#L74)

- Config reader constrains `MENU_LAYOUT` to top or left.
  [`navigation.ts:33`](../../apps/web/src/config/navigation.ts#L33)

**Top Menu Behavior**

- TopMenu consumes existing menu sections and owns dropdown/mobile state.
  [`TopMenu.tsx:96`](../../apps/web/src/components/TopMenu.tsx#L96)

- Nested-route matching keeps active state on detail pages.
  [`TopMenu.tsx:106`](../../apps/web/src/components/TopMenu.tsx#L106)

- Desktop dropdowns support hover, click, focus, Escape, and ARIA state.
  [`TopMenu.tsx:137`](../../apps/web/src/components/TopMenu.tsx#L137)

- Mobile navigation exposes expanded state and skips empty menus.
  [`TopMenu.tsx:113`](../../apps/web/src/components/TopMenu.tsx#L113)

**Page Wiring**

- Protected dashboard passes server-selected layout into the shell.
  [`dashboard/page.tsx:28`](../../apps/web/src/app/dashboard/page.tsx#L28)

- Client preferences form preserves the layout prop across the client boundary.
  [`PreferencesForm.tsx:76`](../../apps/web/src/app/preferences/PreferencesForm.tsx#L76)

**Tests**

- Top layout selection remains isolated from sidebar behavior.
  [`AppShell.unit.test.tsx:91`](../../apps/web/src/tests/unit/AppShell.unit.test.tsx#L91)

- Review-found desktop dropdown and nested-route cases are covered.
  [`AppShell.unit.test.tsx:123`](../../apps/web/src/tests/unit/AppShell.unit.test.tsx#L123)
