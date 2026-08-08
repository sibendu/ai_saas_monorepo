---
baseline_commit: 352a31537ed26ca1894db0d32fb03ff98cb9ae20
---

# Story 5.5: Provide Custom Theme Extension Documentation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a SaaS foundation maintainer,
I want clear custom-theme documentation and a copyable example theme stylesheet,
so that operators can create and enable a custom brand theme without changing application code.

## Acceptance Criteria

1. A canonical custom-theme guide exists at `docs/theme-customization.md`.
2. `README.md` links to the custom-theme guide from a discoverable customization or theming section.
3. `apps/web/public/theme-custom-example.css` exists and is valid plain CSS.
4. The example stylesheet defines the same CSS custom property API expected by `theme-default.css`, `theme-light.css`, and `theme-dark.css`.
5. Semantic color values in the example stylesheet use Tailwind 3 opacity-compatible channel values, for example `--color-primary: 14 116 144;`, not hex, named colors, or wrapped `rgb(...)`.
6. The documentation explains the supported workflow:
   - copy `apps/web/public/theme-custom-example.css` to `apps/web/public/theme-custom.css`
   - modify CSS variable values
   - set `THEME=custom`
   - restart or rebuild the web app, depending on deployment mode
7. The documentation explains safe custom theme naming: the loader from Story 5.4 accepts lowercase slugs containing letters, digits, and hyphens, and resolves `THEME=<slug>` to `/theme-<slug>.css`.
8. The documentation warns that the active theme name is startup configuration, not a runtime user preference; do not use admin UI, cookies, localStorage, or client-side stylesheet swapping for this story.
9. The documentation includes practical validation steps for custom themes, including token parity, CSS syntax sanity, `npm run type-check --workspace=apps/web`, and `npm run build --workspace=apps/web`.
10. The story does not modify theme loading, Tailwind mappings, component classes, auth, BFF, Prisma, or admin behavior.

## Tasks / Subtasks

- [x] Confirm prerequisite Epic 5 implementation state. (AC: 4, 6, 7, 10)
  - [x] Verify `apps/web/public/theme-default.css` exists from Story 5.1.
  - [x] Verify `apps/web/tailwind.config.js` has semantic token mappings from Story 5.2.
  - [x] Verify `apps/web/public/theme-light.css` and `apps/web/public/theme-dark.css` exist from Story 5.3.
  - [x] Verify `apps/web/src/config/theme.ts` and `apps/web/src/app/layout.tsx` implement safe startup theme loading from Story 5.4.
  - [x] If prerequisites are missing, stop and complete Stories 5.1-5.4 first; do not silently implement their scope inside this story.
- [x] Create the custom theme example stylesheet. (AC: 3, 4, 5)
  - [x] Add `apps/web/public/theme-custom-example.css`.
  - [x] Copy the full variable contract from the implemented `theme-default.css`.
  - [x] Use visibly different but accessible sample brand values so operators can see which values are intended to be edited.
  - [x] Preserve non-brand token names exactly: typography, spacing, radius, border, focus, shadow, and legacy `globals.css` aliases.
  - [x] Keep compatibility aliases such as `--background-start-rgb` and `--background-end-rgb` in the format required by the current `globals.css`.
- [x] Add the custom-theme documentation. (AC: 1, 6, 7, 8, 9)
  - [x] Add `docs/theme-customization.md`.
  - [x] Document the file naming convention: `theme-<slug>.css` in `apps/web/public/`.
  - [x] Document the expected `THEME` env var behavior and examples for `light`, `dark`, and `custom`.
  - [x] Explain that `THEME=custom` requires a real `apps/web/public/theme-custom.css` file; the example file is a template, not the loaded file.
  - [x] Include a concise variable reference grouped by colors, typography, spacing, shape, focus, shadows, and legacy aliases.
  - [x] Include a short troubleshooting section for missing stylesheet, invalid theme slug fallback, unreadable contrast, and stale theme after not restarting.
- [x] Link the guide from the README. (AC: 2)
  - [x] Add a brief `Theme Customization` section or subsection in `README.md`.
  - [x] Link to `docs/theme-customization.md`.
  - [x] Keep the README addition concise; detailed steps belong in the doc.
- [x] Validate the documentation and static CSS. (AC: 3, 4, 5, 9, 10)
  - [x] Compare custom property names in `theme-custom-example.css` against `theme-default.css`; sets must match unless prerequisite implementation intentionally changed the contract.
  - [x] Confirm no semantic `--color-*` token in the example file uses hex, named colors, or `rgb(...)`.
  - [x] Run `npm run type-check --workspace=apps/web`.
  - [x] Run `npm run build --workspace=apps/web`.
  - [x] If a build fails due to a pre-existing unrelated issue, document the exact command and failure in the Dev Agent Record.

## Dev Notes

### Scope Boundaries

- This story is documentation plus one example static CSS file.
- Do not add or change the theme loader. Story 5.4 owns `THEME` parsing, sanitization, and `<link>` insertion.
- Do not add runtime switching or persistence. Active theme remains immutable for a running app session.
- Do not edit `apps/web/tailwind.config.js`; Story 5.2 owns Tailwind token mapping.
- Do not migrate component class names in `AppShell`, `TopMenu`, admin screens, auth screens, dashboard, customers, tasks, or preferences.
- Do not touch BFF, Prisma, NextAuth, shared types, admin APIs, or database migrations.

### Current Code State

- At story creation time, `apps/web/public/` did not exist in the working tree.
- `apps/web/tailwind.config.js` still had `theme: { extend: {} }`.
- `apps/web/src/config/theme.ts` did not exist.
- `apps/web/src/app/layout.tsx` was still a Server Component root layout that imported `./globals.css`, used `next/font/google` `Inter`, rendered `<html lang="en">`, and wrapped children in `AuthProvider`.
- `apps/web/src/app/globals.css` currently defines only legacy RGB variables and uses `rgb(var(--background-end-rgb))` / `rgb(var(--background-start-rgb))`; keep those alias formats compatible in example theme files.
- `README.md` currently covers setup, Prisma, dev, tests, build, architecture, security, deployment, and adding new features, but has no theme customization section.
- `docs/` currently contains `project-context.md`; adding `docs/theme-customization.md` follows the existing project-knowledge location from BMad config.

### Required Documentation Content

`docs/theme-customization.md` should include:

- Purpose: theme files override CSS variables; no application code changes are required for normal branding changes.
- Prerequisites: Stories 5.1-5.4 must be implemented so `theme-default.css`, light/dark themes, Tailwind mappings, and safe `THEME` loading exist.
- File convention:
  - built-ins: `apps/web/public/theme-light.css`, `apps/web/public/theme-dark.css`
  - example template: `apps/web/public/theme-custom-example.css`
  - loaded custom file for `THEME=custom`: `apps/web/public/theme-custom.css`
- Commands for common flows:

```powershell
Copy-Item apps\web\public\theme-custom-example.css apps\web\public\theme-custom.css
$env:THEME = 'custom'
npm run dev:web
```

```bash
cp apps/web/public/theme-custom-example.css apps/web/public/theme-custom.css
THEME=custom npm run dev:web
```

- Deployment note: static theme files under `apps/web/public/` must be present before the web app is built or packaged into a container image.
- Validation checklist: token parity, CSS syntax sanity, browser network request for `/theme-custom.css`, readable contrast, type-check, and build.
- Troubleshooting:
  - If the app loads light theme, verify the slug matches the safe pattern and the env var is present in the server process.
  - If the browser returns 404 for `/theme-custom.css`, verify the file name is `theme-custom.css`, not `theme-custom-example.css`.
  - If colors do not change, confirm the UI uses semantic Tailwind utilities from Story 5.2 or CSS variables directly.
  - If changes do not appear after editing the file, restart the dev server or rebuild/redeploy production assets.

### Example Stylesheet Requirements

- Start from the implemented `theme-default.css` variable names, not from a stale copy in this story file.
- Use plain CSS with a single `:root` block unless the implemented contract requires more.
- Semantic `--color-*` variables must be space-separated RGB channel values.
- Legacy compatibility aliases that are consumed by `globals.css` must remain compatible with `rgb(var(...))`.
- Choose sample custom colors that are visibly distinct from light/dark defaults while staying readable. A teal/cyan primary with neutral surfaces is acceptable.
- Include a short CSS comment at the top explaining that this file is a template and should be copied to `theme-custom.css` or another `theme-<slug>.css` file before use.

### Architecture Compliance

- AD-08 requires CSS variables for brand colors, typography, spacing, and theme stylesheet overrides.
- AD-08 requires static theme files named `public/theme-{name}.css` and loaded at startup.
- AD-07 and AD-08 require config-driven layout/theme decisions to be immutable during a session.
- The PRD allows admin-driven theme selection as an alternative, but Epic 5 selected config-driven loading; this story documents and supports that path only.
- Next.js serves files from `apps/web/public/` at the site root, so `apps/web/public/theme-custom.css` is requested as `/theme-custom.css`.

### Previous Story Intelligence

- Story 5.1 owns `theme-default.css`, the semantic variable contract, channel-value colors, and legacy `globals.css` compatibility aliases.
- Story 5.2 owns `apps/web/tailwind.config.js` mappings through `theme.extend` and keeps Tailwind v3 defaults available.
- Story 5.3 owns `theme-light.css` and `theme-dark.css`, requiring token parity across packaged theme files.
- Story 5.4 owns safe `THEME` loading and explicitly allows safe custom slugs such as `custom`, resolving them to `/theme-custom.css`.
- At story creation time, Stories 5.1-5.4 were `ready-for-dev`, not `done`; their code artifacts were absent. The dev agent must verify prerequisites before implementing Story 5.5.

### Git Intelligence

- Recent commits are admin-panel focused:
  - `352a315 fix: handle non-json admin api responses`
  - `29b9d0b feat: add admin audit trail logging`
  - `19782dc merge: complete admin role module mapping`
  - `c0d11e8 feat: complete admin role module mapping`
  - `aeeaf45 feat: add admin module management tab`
- Relevant implementation pattern: keep changes scoped, add focused tests for TypeScript behavior when present, and avoid opportunistic rewrites of unrelated UI or API code.
- For this docs/static-CSS story, token parity and build validation are higher value than React unit tests unless the implementation touches TS/TSX files.

### Latest Technical Information

- The repo uses Tailwind CSS `^3.4.0` with a CommonJS `tailwind.config.js` and `postcss.config.js`. Do not introduce Tailwind v4 `@theme` syntax or v4-only CLI assumptions in this story.
- Tailwind v3 custom color mappings support opacity modifiers when colors are mapped as `rgb(var(--color-name) / <alpha-value>)`; that requires theme CSS variables to store channel values.
- Next.js official docs state files under `public` are served from the site root, which is why `/theme-custom.css` maps to `apps/web/public/theme-custom.css`.
- Next.js environment variable docs support server-side env access without `NEXT_PUBLIC_`; the browser only needs the sanitized stylesheet href rendered by Story 5.4.

### Testing Guidance

- Minimum validation:
  - token-name parity check between `theme-default.css` and `theme-custom-example.css`
  - manual CSS syntax inspection or build validation
  - `npm run type-check --workspace=apps/web`
- Preferred validation:
  - `npm run build --workspace=apps/web`
  - run locally with `THEME=custom` and verify the initial document requests `/theme-custom.css` after copying the example to `theme-custom.css`
- Do not commit temporary copied `theme-custom.css` unless the implementation intentionally decides to ship a loaded custom sample in addition to `theme-custom-example.css`.

### Project Structure Notes

- New file: `docs/theme-customization.md`
- New file: `apps/web/public/theme-custom-example.css`
- Update file: `README.md`
- Existing prerequisite files to read before implementation:
  - `apps/web/public/theme-default.css`
  - `apps/web/public/theme-light.css`
  - `apps/web/public/theme-dark.css`
  - `apps/web/src/config/theme.ts`
  - `apps/web/src/app/layout.tsx`
  - `apps/web/tailwind.config.js`
  - `apps/web/src/app/globals.css`
- Detected artifact variance: planning docs mention `apps/web/tailwind.config.ts`, but the repository uses `apps/web/tailwind.config.js`; follow the repository.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md` - Epic 5, Story 5.5]
- [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md` - FRx05 Themeable Styling]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md` - AD-07 and AD-08]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-DISCUSSION.md` - Themes: Why CSS Variables + Config-Driven?]
- [Source: `docs/project-context.md` - Technology Stack, Tailwind, React/Next.js, Testing Rules, Environment Variables]
- [Source: `_bmad-output/implementation-artifacts/5-1-define-css-variables-for-theme-colors-fonts-spacing.md` - token contract and boundary]
- [Source: `_bmad-output/implementation-artifacts/5-2-integrate-css-variables-with-tailwind-config.md` - Tailwind mapping boundary]
- [Source: `_bmad-output/implementation-artifacts/5-3-create-light-dark-themes.md` - light/dark theme boundary]
- [Source: `_bmad-output/implementation-artifacts/5-4-config-driven-theme-loading-env-var-or-config-file.md` - safe theme loader boundary]
- [Source: `README.md` - current documentation structure]
- [Source: `apps/web/src/app/globals.css` - current legacy CSS variable usage]
- [Source: `apps/web/src/app/layout.tsx` - current root layout]
- [Source: `apps/web/tailwind.config.js` - current Tailwind config path and format]
- [Source: `apps/web/postcss.config.js` - current Tailwind v3 PostCSS pipeline]
- [Source: `apps/web/src/config/navigation.ts` - existing env-backed config helper pattern]
- [Source: Next.js public folder docs - https://nextjs.org/docs/app/api-reference/file-conventions/public-folder]
- [Source: Next.js environment variables docs - https://nextjs.org/docs/app/guides/environment-variables]
- [Source: Tailwind CSS v3 custom colors - https://v3.tailwindcss.com/docs/customizing-colors]

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

- 2026-07-31: Verified Epic 5 prerequisites exist: `theme-default.css`, `theme-light.css`, `theme-dark.css`, semantic Tailwind mappings, and safe startup loader files.
- 2026-07-31: Red test confirmed `apps/web/public/theme-custom-example.css` was missing before implementation: `..\..\node_modules\.bin\vitest.cmd run src\tests\unit\ThemeCustomExample.unit.test.ts --config vitest.config.ts --coverage.enabled=false --reporter=default`.
- 2026-07-31: Added static CSS contract test for token parity and Tailwind-compatible `--color-*` channel values.
- 2026-07-31: `npm.cmd run build --workspace=apps/web` failed when inherited `NODE_ENV=development`; failure occurred during `/_global-error` prerender with `Cannot read properties of null (reading 'useContext')`.
- 2026-07-31: Reran build with production environment: `cmd /c "set NODE_ENV=production&& npm.cmd run build --workspace=apps/web"` passed.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added a canonical custom theme guide covering copy workflow, `THEME` behavior, safe slug naming, startup-only configuration, validation, and troubleshooting.
- Added a copyable `theme-custom-example.css` template that matches the default theme variable contract and uses space-separated RGB channel values for semantic colors.
- Added a concise README theming entry linking to the custom-theme guide.
- Added focused unit coverage for custom theme token parity and semantic color formatting.
- Validation passed: web type-check, web build with `NODE_ENV=production`, web unit/integration tests, and BFF unit/integration tests.

### File List

- `README.md`
- `docs/theme-customization.md`
- `apps/web/public/theme-custom-example.css`
- `apps/web/src/tests/unit/ThemeCustomExample.unit.test.ts`
- `_bmad-output/implementation-artifacts/5-5-provide-custom-theme-extension-documentation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-07-31: Implemented custom theme extension documentation, example stylesheet, README link, and static CSS validation test.
