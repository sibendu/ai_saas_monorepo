---
baseline_commit: 352a31537ed26ca1894db0d32fb03ff98cb9ae20
---

# Story 5.4: Config-Driven Theme Loading (Env Var or Config File)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a SaaS foundation maintainer,
I want the web app to load the active theme stylesheet from startup configuration,
so that deployments can switch between packaged themes or safe custom themes without changing application code.

## Acceptance Criteria

1. The web app reads the active theme from server-side startup configuration, using `THEME` as the primary env var.
2. Missing or blank `THEME` defaults to `light`.
3. `light` and `dark` resolve to `/theme-light.css` and `/theme-dark.css`.
4. Theme names are validated before being interpolated into a stylesheet URL; invalid names fall back to `light` and cannot produce path traversal, absolute URLs, query strings, or script/data URLs.
5. `apps/web/src/app/layout.tsx` includes exactly one active theme stylesheet link for the resolved theme, in addition to the existing `globals.css` import.
6. Theme selection is immutable for a running app session; there is no client-side switcher, cookie, localStorage, user preference, admin UI, or dynamic stylesheet swapping in this story.
7. The implementation preserves the existing `Inter` font setup, metadata export, `AuthProvider` wrapping, `lang="en"`, and Server Component behavior of the root layout.
8. The implementation does not create or edit theme token files owned by Stories 5.1 and 5.3 except for prerequisite verification. Required files are `apps/web/public/theme-light.css` and `apps/web/public/theme-dark.css`; `theme-default.css` remains the token contract source.
9. A focused unit test covers theme config resolution for default, `light`, `dark`, safe custom slug support, and invalid-value fallback.
10. Validation includes `npm run type-check --workspace=apps/web` and `npm run build --workspace=apps/web`; any unrelated failure is documented with the exact command and cause.

## Tasks / Subtasks

- [x] Confirm prerequisites from earlier Epic 5 stories. (AC: 3, 8)
  - [x] Verify `apps/web/public/theme-default.css` exists from Story 5.1.
  - [x] Verify `apps/web/public/theme-light.css` and `apps/web/public/theme-dark.css` exist from Story 5.3.
  - [x] If these files are missing, stop and complete Stories 5.1 and 5.3 first. Do not silently fold theme-file creation into this story.
- [x] Add a small server-side theme config helper. (AC: 1, 2, 3, 4, 9)
  - [x] Prefer `apps/web/src/config/theme.ts` to mirror the existing `apps/web/src/config/navigation.ts` config pattern.
  - [x] Export a `ThemeName` type and a `getConfiguredTheme()` function.
  - [x] Read `process.env.THEME`, trim/lowercase it, and default to `light` when missing.
  - [x] Allow known built-in themes `light` and `dark`.
  - [x] Allow safe future custom theme slugs matching a conservative pattern such as lowercase letters, digits, and hyphens. This keeps Story 5.5 from requiring loader code changes for `THEME=custom`.
  - [x] Reject invalid values such as `../dark`, `/theme-dark.css`, `https://...`, `javascript:...`, `dark.css`, `dark?x=1`, and empty strings by falling back to `light`.
  - [x] Export a `getConfiguredThemeHref()` helper or equivalent that returns `/theme-${theme}.css` only after validation.
- [x] Load the stylesheet from the root layout. (AC: 1, 3, 5, 6, 7)
  - [x] Update `apps/web/src/app/layout.tsx`.
  - [x] Keep `import './globals.css'` exactly as the base global CSS import.
  - [x] Import the theme href helper and add a single `<link rel="stylesheet" href={themeHref} />` in the root document head.
  - [x] Do not use `next/head`; this is an App Router root layout.
  - [x] Do not add `'use client'`, React state, effects, browser storage, cookies, or event listeners.
- [x] Add focused tests. (AC: 2, 3, 4, 9)
  - [x] Add `apps/web/src/config/theme.unit.test.ts`.
  - [x] Save and restore the previous `process.env.THEME` value in the test setup/teardown.
  - [x] Cover default `light`, explicit `light`, explicit `dark`, uppercase/whitespace normalization if supported, safe custom slug such as `custom`, and invalid fallback cases.
  - [x] Assert href generation returns root-relative public paths such as `/theme-dark.css`, never raw env input.
- [x] Validate the app. (AC: 5, 7, 10)
  - [x] Run `npm run test:unit --workspace=apps/web -- theme.unit.test` if the workspace script supports the filter. If not, run `npm run test:unit --workspace=apps/web`.
  - [x] Run `npm run type-check --workspace=apps/web`.
  - [x] Run `npm run build --workspace=apps/web`.
  - [ ] Optionally run the app with `THEME=dark npm run dev --workspace=apps/web` and confirm the initial HTML references `/theme-dark.css`, then remove any temporary local changes.

## Dev Notes

### Scope Boundaries

- This story only chooses and loads the active theme stylesheet.
- Do not create `theme-default.css`, `theme-light.css`, `theme-dark.css`, or `theme-custom-example.css` here unless a prerequisite story is intentionally being completed first.
- Do not update `apps/web/tailwind.config.js`; Story 5.2 owns Tailwind token mapping.
- Do not migrate component class names in `AppShell`, `TopMenu`, auth pages, admin pages, dashboard, customers, tasks, or preferences.
- Do not add an admin theme selector, preferences setting, DB field, cookie, localStorage value, or runtime switcher.
- Do not add CSS-in-JS, styled-components, Chakra UI, or any theming dependency.

### Current Code State

- `apps/web/src/app/layout.tsx` is a Server Component root layout. It imports `Metadata`, `Inter`, `./globals.css`, and `AuthProvider`; it renders `<html lang="en"><body className={inter.className}>`.
- `apps/web/src/app/globals.css` currently imports Tailwind base/components/utilities, defines legacy RGB variables, and uses `rgb(var(...))` for body text/background.
- `apps/web/src/config/navigation.ts` already has an env-backed config helper: `getConfiguredMenuLayout()` returns `top` only for `process.env.MENU_LAYOUT === 'top'`, otherwise `left`.
- `apps/web/src/lib/role-menu.ts` consumes `getConfiguredMenuLayout()` server-side while preparing shell data. Use the same simple, server-side config style for theme loading.
- `apps/web/public/` was missing at story creation time, and no existing code referenced `THEME` or `theme-*.css`.
- Existing unit tests focus on `AppShell` behavior and literal class names. This story should add tests for the new theme helper rather than rewriting shell tests.

### Required Implementation Shape

Use a pure helper so validation is isolated from React/Next rendering:

```ts
export type ThemeName = string

const DEFAULT_THEME = 'light'
const SAFE_THEME_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function getConfiguredTheme(): ThemeName {
  const configuredTheme = process.env.THEME?.trim().toLowerCase()

  if (!configuredTheme || !SAFE_THEME_NAME_PATTERN.test(configuredTheme)) {
    return DEFAULT_THEME
  }

  return configuredTheme
}

export function getConfiguredThemeHref(): string {
  return `/theme-${getConfiguredTheme()}.css`
}
```

The exact code may vary, but the behavior must remain: sanitize first, then build a root-relative `/theme-${name}.css` href.

In `layout.tsx`, keep the root layout server-rendered and add the link without changing the body tree:

```tsx
const themeHref = getConfiguredThemeHref()

return (
  <html lang="en">
    <head>
      <link rel="stylesheet" href={themeHref} />
    </head>
    <body className={inter.className}>
      <AuthProvider>{children}</AuthProvider>
    </body>
  </html>
)
```

### Architecture Compliance

- AD-08 requires Tailwind CSS 3.4.x plus CSS variables and startup-loaded `public/theme-{name}.css` stylesheets.
- AD-07 and AD-08 require config-driven layout/theme decisions to be immutable during the session.
- The PRD allows admin-driven dynamic swapping as an alternative, but this epic selected config-driven loading. This story implements the config-driven path only.
- Static theme files belong under `apps/web/public/`, which Next serves from the site root, so `apps/web/public/theme-dark.css` is requested as `/theme-dark.css`.
- Server-only `process.env.THEME` is sufficient here because the browser only needs the resolved href in rendered HTML. Do not introduce `NEXT_PUBLIC_THEME`.

### Previous Story Intelligence

- Story 5.1 owns `apps/web/public/theme-default.css`, semantic CSS variables, channel-value color syntax, and the legacy `globals.css` aliases.
- Story 5.2 owns `apps/web/tailwind.config.js` mappings and specifically leaves active stylesheet loading to Story 5.4.
- Story 5.3 owns `apps/web/public/theme-light.css` and `apps/web/public/theme-dark.css`, and explicitly says it must not load or select themes.
- At story creation time, Stories 5.1, 5.2, and 5.3 were `ready-for-dev`, not `done`; their files may still be absent in the working tree. The dev agent must verify prerequisites before implementing 5.4.

### Testing Guidance

- Unit-test the helper as a pure function. Reset `process.env.THEME` between cases to avoid order-dependent tests.
- Testing `layout.tsx` directly may require mocking `next/font/google`; only add layout rendering tests if they are low-friction and stable.
- `type-check` proves the root layout/helper import compiles.
- `build` proves the App Router accepts the root document shape and stylesheet link.
- If the app build fails because prerequisite theme files are absent, that is an implementation-order blocker, not a reason to create theme files inside 5.4.

### Latest Technical Information

- Official Next.js App Router environment-variable docs state server-side environment variables are available without a `NEXT_PUBLIC_` prefix, while public variables are bundled for browser use. This story should keep `THEME` server-only and render only the final stylesheet href.
- Official Next.js public-folder docs state files under an app `public` folder are served from the site root; this supports `/theme-light.css`, `/theme-dark.css`, and future `/theme-custom.css`.
- Official Next.js App Router layout docs keep root layout responsible for the root `<html>` and `<body>` tags. Do not migrate this story to the old Pages Router `_document` or `next/head` pattern.
- Tailwind v3 CSS-variable color guidance remains relevant for the prerequisite theme files, but this story must not change the Tailwind v3 config.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md` - Epic 5, Story 5.4]
- [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md` - FRx05 Themeable Styling]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md` - AD-07 and AD-08]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-DISCUSSION.md` - Themes: Why CSS Variables + Config-Driven?]
- [Source: `docs/project-context.md` - Technology Stack, React/Next.js, Tailwind, Testing Rules, Environment Variables]
- [Source: `_bmad-output/implementation-artifacts/5-1-define-css-variables-for-theme-colors-fonts-spacing.md` - token contract and prerequisite boundary]
- [Source: `_bmad-output/implementation-artifacts/5-2-integrate-css-variables-with-tailwind-config.md` - Tailwind mapping boundary]
- [Source: `_bmad-output/implementation-artifacts/5-3-create-light-dark-themes.md` - light/dark stylesheet boundary]
- [Source: `apps/web/src/app/layout.tsx` - current root layout]
- [Source: `apps/web/src/app/globals.css` - current global CSS and legacy aliases]
- [Source: `apps/web/src/config/navigation.ts` - existing env-backed config helper pattern]
- [Source: `apps/web/src/lib/role-menu.ts` - server-side config consumption pattern]
- [Source: Next.js App Router environment variables - https://nextjs.org/docs/app/guides/environment-variables]
- [Source: Next.js public folder convention - https://nextjs.org/docs/app/api-reference/file-conventions/public-folder]
- [Source: Next.js App Router layout convention - https://nextjs.org/docs/app/api-reference/file-conventions/layout]
- [Source: Tailwind CSS v3 custom colors and CSS variables - https://v3.tailwindcss.com/docs/customizing-colors]

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

- 2026-07-30: Prerequisite check confirmed `apps/web/public/theme-default.css`, `apps/web/public/theme-light.css`, and `apps/web/public/theme-dark.css` exist.
- 2026-07-30: Red phase: `npm.cmd run test:unit --workspace=apps/web -- theme.unit.test` failed because `@/config/theme` did not exist.
- 2026-07-30: Green phase: `npm.cmd run test:unit --workspace=apps/web -- theme.unit.test` passed with 28 test files and 175 tests, including 16 theme config tests.
- 2026-07-30: `npm.cmd run type-check --workspace=apps/web` passed.
- 2026-07-30: `npm.cmd run build --workspace=apps/web` initially failed with `NODE_ENV=development`: Next warned about non-standard `NODE_ENV` and prerendering `/_global-error` failed with `TypeError: Cannot read properties of null (reading 'useContext')`.
- 2026-07-30: `$env:NODE_ENV='production'; npm.cmd run build --workspace=apps/web` passed.
- 2026-07-30: `npm.cmd run test --workspace=apps/web` passed: 28 unit test files / 175 tests and 2 integration test files / 3 tests.
- 2026-07-30: `npm.cmd run test` passed root regression: web unit/integration, BFF unit, and BFF integration tests.
- 2026-07-30: `npm.cmd run lint --workspace=apps/web` failed because the script invokes `next lint`, which Next treated as an invalid project directory `apps/web/lint`.
- 2026-07-30: Optional `THEME=dark` dev-server HTML check was attempted on alternate ports but could not run because an existing `next dev` process already held `apps/web/.next/dev/lock`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added a server-side theme config helper that normalizes `THEME`, defaults missing or blank values to `light`, accepts safe lowercase/digit/hyphen slugs, and constructs root-relative `/theme-${name}.css` hrefs only after validation.
- Updated the root App Router layout to render exactly one active theme stylesheet link while preserving the existing `globals.css` import, Inter font setup, metadata export, `AuthProvider`, `lang="en"`, and Server Component behavior.
- Added focused unit coverage for default, blank, built-in, normalized custom, and invalid theme inputs.
- Validation passed for focused unit tests, web type-check, production web build, web tests, and root regression tests. The exact unmodified build command fails only when the inherited shell has `NODE_ENV=development`; lint also has an unrelated `next lint` script compatibility issue. The optional dev-server smoke check was skipped because an existing `next dev` process held the app's dev lock.

### File List

- `_bmad-output/implementation-artifacts/5-4-config-driven-theme-loading-env-var-or-config-file.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/config/theme.ts`
- `apps/web/src/config/theme.unit.test.ts`

### Change Log

- 2026-07-30: Implemented config-driven startup theme stylesheet loading and validation for Story 5.4.
