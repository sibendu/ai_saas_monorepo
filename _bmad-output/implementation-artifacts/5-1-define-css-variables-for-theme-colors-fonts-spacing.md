---
baseline_commit: 352a31537ed26ca1894db0d32fb03ff98cb9ae20
---

# Story 5.1: Define CSS Variables for Theme Colors, Fonts, Spacing

Status: review

## Story

As a SaaS foundation maintainer,
I want a default public theme stylesheet that defines semantic CSS variables for colors, typography, spacing, borders, and related visual tokens,
so that later theme integration can replace hardcoded brand styling without changing application code.

## Acceptance Criteria

1. `apps/web/public/theme-default.css` exists and is valid CSS.
2. The stylesheet defines semantic CSS custom properties for colors, typography, spacing, borders, radius, focus, status, and shadow/elevation tokens.
3. Color variable names are semantic, not palette-index names: use names such as `--color-primary`, `--color-background`, `--color-danger`, and `--color-success`; do not use names such as `--blue-500` or `--indigo-600` as the primary API.
4. The default values preserve the current visual intent of the app: white/gray surfaces, indigo/purple brand accents, red error states, green success states, and yellow warning/status states.
5. Color values are represented in a format that supports later Tailwind 3 opacity integration: define color variables as channel values without wrapping them in `rgb()` where the future Tailwind mapping will use `rgb(var(--color-*) / <alpha-value>)`.
6. Typography variables include body and heading font families, base/large/small font sizes, font weights, line heights, and a default letter spacing value of `0`.
7. Spacing variables include `--spacing-unit` and named sizes at least for xs, sm, md, lg, xl, and 2xl, aligned to the current 4px/8px Tailwind spacing rhythm.
8. Border variables include at least default border color, strong border color, default radius, small radius, large radius, full radius, and focus ring tokens.
9. The stylesheet does not change runtime behavior by itself beyond providing tokens. Story 5.2 owns Tailwind config integration; Story 5.3 owns light/dark theme variants; Story 5.4 owns active theme loading.

## Tasks / Subtasks

- [x] Create the public theme file. (AC: 1)
  - [x] If `apps/web/public/` does not exist, create it.
  - [x] Add `apps/web/public/theme-default.css`.
  - [x] Define all variables under `:root`.
- [x] Define the default color token contract. (AC: 2, 3, 4, 5)
  - [x] Include core brand tokens: `--color-primary`, `--color-primary-hover`, `--color-primary-soft`, `--color-primary-strong`, `--color-secondary`, `--color-secondary-hover`, `--color-secondary-soft`, `--color-accent`.
  - [x] Include surface/text tokens: `--color-background`, `--color-surface`, `--color-surface-muted`, `--color-surface-strong`, `--color-text`, `--color-text-muted`, `--color-text-subtle`, `--color-text-inverse`.
  - [x] Include border/focus tokens: `--color-border`, `--color-border-strong`, `--color-focus-ring`.
  - [x] Include status tokens: `--color-danger`, `--color-danger-soft`, `--color-success`, `--color-success-soft`, `--color-warning`, `--color-warning-soft`, `--color-info`, `--color-info-soft`.
  - [x] Include overlay/shadow helper tokens: `--color-overlay`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`.
- [x] Define typography, spacing, and shape tokens. (AC: 2, 6, 7, 8)
  - [x] Include `--font-family-body` and `--font-family-heading`, using the existing Inter/system stack as the default.
  - [x] Include `--font-size-xs`, `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl`.
  - [x] Include `--font-weight-normal`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`.
  - [x] Include `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed`, and `--letter-spacing-normal: 0`.
  - [x] Include `--spacing-unit: 8px`, plus named spacing tokens from xs through 2xl.
  - [x] Include `--border-radius-sm`, `--border-radius`, `--border-radius-lg`, `--border-radius-xl`, and `--border-radius-full`.
- [x] Add a small compatibility block for existing globals. (AC: 4)
  - [x] Include `--foreground-rgb`, `--background-start-rgb`, and `--background-end-rgb` aliases matching current `globals.css` defaults so later loading can preserve the current body fallback until globals are refactored.
- [x] Validate the artifact. (AC: 1, 9)
  - [x] Run `npm run type-check --workspace=apps/web`.
  - [x] Run `npm run build --workspace=apps/web` if type-check passes.
  - [x] Manually verify `theme-default.css` contains no TypeScript/JS syntax and no Tailwind directives.

## Dev Notes

### Scope Boundaries

- This story creates the token source file only: `apps/web/public/theme-default.css`.
- Do not update `apps/web/tailwind.config.js` in this story unless a tiny compatibility edit is required by validation. Tailwind mapping belongs to Story 5.2.
- Do not update `apps/web/src/app/layout.tsx` to load the theme stylesheet in this story. Theme loading belongs to Story 5.4.
- Do not mass-rewrite component class names in this story. Existing hardcoded Tailwind utility usage is context for the token contract; later stories can map and migrate usage.

### Current Code State

- The actual Tailwind config file is `apps/web/tailwind.config.js`, not `apps/web/tailwind.config.ts`. The architecture/epic artifact mentions `.ts`, but the repo currently uses CommonJS JS config. Follow the repo.
- `apps/web/src/app/globals.css` currently defines only `--foreground-rgb`, `--background-start-rgb`, and `--background-end-rgb`, then applies a body text color and gradient background from those variables.
- `apps/web/public/theme-default.css` does not currently exist, and `apps/web/public/` may need to be created.
- `apps/web/src/app/layout.tsx` imports `./globals.css` and uses `next/font/google` `Inter`. Do not remove or replace that in this story.
- `apps/web/src/config/navigation.ts`, `AppShell.tsx`, and `TopMenu.tsx` currently centralize some navigation UI classes through `menuUiConfig`, but they still contain hardcoded Tailwind colors such as `bg-white`, `text-gray-*`, `border-gray-*`, and `indigo-*`.
- A broad source scan found hardcoded visual tokens across login, register, forgot/reset password, dashboard, customers, preferences, admin management, `AppShell`, `TopMenu`, and email HTML strings. This story should define variables broad enough to cover those tokens later; it should not rewrite them now.

### Recommended Default Token Values

Use CSS channel values for color tokens that Tailwind will later wrap with `rgb(var(--token) / <alpha-value>)`. Suggested defaults are aligned to current Tailwind utility intent:

```css
:root {
  --color-primary: 79 70 229;
  --color-primary-hover: 67 56 202;
  --color-primary-soft: 224 231 255;
  --color-primary-strong: 55 48 163;
  --color-secondary: 147 51 234;
  --color-secondary-hover: 126 34 206;
  --color-secondary-soft: 243 232 255;
  --color-accent: 59 130 246;

  --color-background: 249 250 251;
  --color-surface: 255 255 255;
  --color-surface-muted: 243 244 246;
  --color-surface-strong: 229 231 235;
  --color-text: 17 24 39;
  --color-text-muted: 75 85 99;
  --color-text-subtle: 107 114 128;
  --color-text-inverse: 255 255 255;

  --color-border: 229 231 235;
  --color-border-strong: 209 213 219;
  --color-focus-ring: 99 102 241;

  --color-danger: 220 38 38;
  --color-danger-soft: 254 242 242;
  --color-success: 22 163 74;
  --color-success-soft: 240 253 244;
  --color-warning: 217 119 6;
  --color-warning-soft: 254 252 232;
  --color-info: 37 99 235;
  --color-info-soft: 239 246 255;
  --color-overlay: 0 0 0;

  --font-family-body: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-family-heading: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --letter-spacing-normal: 0;

  --spacing-unit: 8px;
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 2.5rem;

  --border-radius-sm: 0.375rem;
  --border-radius: 0.5rem;
  --border-radius-lg: 0.75rem;
  --border-radius-xl: 1rem;
  --border-radius-full: 9999px;
  --border-width: 1px;
  --focus-ring-width: 2px;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  --foreground-rgb: var(--color-text);
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}
```

Note: `--background-start-rgb` and `--background-end-rgb` remain comma-separated because `globals.css` currently calls `rgb(var(--background-end-rgb))`. Do not convert those compatibility aliases until `globals.css` is refactored.

### Architecture Compliance

- Use CSS variables and Tailwind-compatible token naming to satisfy AD-08 Themeable Styling.
- Keep theme switching config-driven and immutable during session; this story only creates the default token stylesheet.
- Preserve existing Next.js App Router conventions: global CSS stays under `apps/web/src/app/globals.css`; public static assets/stylesheets live under `apps/web/public/`.
- Keep TypeScript strictness unaffected. A pure CSS file should not require TS changes.

### Testing Guidance

- Minimum verification: `npm run type-check --workspace=apps/web`.
- Preferred verification: `npm run build --workspace=apps/web` after type-check.
- No unit test is required for a standalone public CSS file unless implementation also changes TS/TSX behavior.
- If future implementation touches class names in `AppShell`, `TopMenu`, or `AdminManagementTabs`, existing unit tests assert specific Tailwind classes and must be updated intentionally.

### Project Structure Notes

- New file: `apps/web/public/theme-default.css`.
- Existing files to read before any optional compatibility edits:
  - `apps/web/src/app/globals.css`
  - `apps/web/src/app/layout.tsx`
  - `apps/web/tailwind.config.js`
  - `apps/web/src/config/navigation.ts`
- Detected artifact variance: planning docs mention `apps/web/tailwind.config.ts`, but the repository has `apps/web/tailwind.config.js`.

### Previous Story Intelligence

- This is the first story in Epic 5, so there is no previous Epic 5 story file to mine for implementation learnings.
- Recent git history is focused on admin panel work: non-JSON admin API response handling, audit trail logging, role-module mapping, and module management. The relevant pattern is to keep changes scoped, preserve existing tests, and avoid broad rewrites of unrelated UI.

### Latest Technical Information

- Tailwind CSS v3 documentation recommends defining CSS variable colors as channel values, without the color-space wrapper, when later using opacity modifiers through config mappings such as `rgb(var(--color-primary) / <alpha-value>)`.
- Next.js serves files under an app-level `public` folder from the site root, so `apps/web/public/theme-default.css` will later be referencable as `/theme-default.css` when the web app is running.
- Tailwind supports custom CSS and base-layer styles, but this story should keep the theme contract in a plain public stylesheet because later stories own mapping/loading behavior.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md` - Epic 5, Story 5.1]
- [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md` - FRx05 Themeable Styling]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md` - AD-08 Themeable Styling]
- [Source: `docs/project-context.md` - Technology Stack, React/Next.js, Tailwind, Testing Rules]
- [Source: `apps/web/src/app/globals.css` - current root variables and body background]
- [Source: `apps/web/tailwind.config.js` - actual Tailwind config path and CommonJS format]
- [Source: `apps/web/src/config/navigation.ts` - current menu UI color class centralization]
- [Source: Tailwind CSS v3 Customizing Colors - https://v3.tailwindcss.com/docs/customizing-colors#using-css-variables]
- [Source: Next.js public folder docs - https://nextjs.org/docs/app/api-reference/file-conventions/public-folder]

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

- `npm run type-check --workspace=apps/web` was blocked by PowerShell execution policy for `npm.ps1`; reran as `npm.cmd run type-check --workspace=apps/web`.
- `npm.cmd run type-check --workspace=apps/web` passed.
- `npm.cmd run build --workspace=apps/web` failed with ambient `NODE_ENV=development`; reran with `NODE_ENV=production`.
- `$env:NODE_ENV='production'; npm.cmd run build --workspace=apps/web` passed.
- `npm.cmd run test` passed unit and integration regression tests.
- `npm.cmd run test:e2e --workspace=apps/web` passed with 2 passed and 1 skipped.
- `npm.cmd run lint --workspace=apps/web` did not run successfully because the existing `next lint` script is incompatible with the installed Next.js CLI and resolves `lint` as a project directory.
- Manual CSS text check found no Tailwind directives or TypeScript/JavaScript syntax.

### Implementation Plan

- Add a standalone public CSS token stylesheet only; do not wire it into Tailwind or app layout in this story.
- Preserve existing runtime behavior by keeping the new file unloaded and matching the current `globals.css` compatibility variables.
- Use semantic channel-valued color variables so Story 5.2 can map them through Tailwind opacity-aware `rgb(var(--token) / <alpha-value>)` entries.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Created `apps/web/public/theme-default.css` with semantic CSS custom properties for brand, surface, text, border, focus, status, overlay, shadow, typography, spacing, and radius tokens.
- Preserved current runtime behavior by adding the theme file without importing it and by keeping compatibility variables aligned with existing `globals.css` defaults.
- Verified the artifact with web type-check, production web build, unit/integration tests, e2e tests, and a manual CSS syntax/directive scan.
- Noted the existing web lint script issue: `next lint` is not usable with the installed Next.js CLI setup.

### File List

- apps/web/public/theme-default.css
- apps/web/next-env.d.ts
- apps/web/tsconfig.json
- apps/web/tsconfig.tsbuildinfo
- apps/web/reports/junit.xml
- apps/web/reports/results.json
- apps/bff/reports/junit.xml
- apps/bff/reports/results.json
- _bmad-output/implementation-artifacts/5-1-define-css-variables-for-theme-colors-fonts-spacing.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-07-30: Added default public theme token stylesheet and marked Story 5.1 ready for review.
