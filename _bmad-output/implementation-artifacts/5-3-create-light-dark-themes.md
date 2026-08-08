---
baseline_commit: 352a31537ed26ca1894db0d32fb03ff98cb9ae20
---

# Story 5.3: Create Light & Dark Themes

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a SaaS foundation maintainer,
I want out-of-box light and dark theme stylesheets that implement the same semantic CSS variable contract,
so that deployments can choose a readable base theme without changing application code.

## Acceptance Criteria

1. `apps/web/public/theme-light.css` exists and is valid CSS.
2. `apps/web/public/theme-dark.css` exists and is valid CSS.
3. Both files define the same CSS custom property names as `apps/web/public/theme-default.css`, including semantic color tokens, typography tokens, spacing tokens, border/radius/focus tokens, shadow tokens, and the legacy `globals.css` compatibility aliases.
4. Color variables stay in Tailwind 3 opacity-compatible channel format for semantic tokens, for example `--color-primary: 79 70 229;`, not `rgb(...)` or hex.
5. `--background-start-rgb` and `--background-end-rgb` stay compatible with the current `globals.css` `rgb(var(...))` usage.
6. The light theme preserves readable light surfaces with dark text and the current indigo/purple brand intent.
7. The dark theme provides readable dark surfaces with light text, visible borders, accessible focus rings, and status colors that remain distinguishable on dark backgrounds.
8. Theme files do not import Tailwind directives, JavaScript, TypeScript, remote assets, or fonts.
9. Theme files do not load themselves or change active theme selection. Story 5.4 owns config-driven stylesheet loading from `layout.tsx`.
10. Verification proves both CSS files parse and expose matching variable names. Preferred validation also proves the app can build with the new public assets present.

## Tasks / Subtasks

- [x] Confirm prerequisite theme contract exists before implementation. (AC: 3, 4, 9)
  - [x] Verify Story 5.1 has been implemented in code: `apps/web/public/theme-default.css` exists.
  - [x] Verify Story 5.2 has been implemented in code if Tailwind utility behavior is part of manual validation: `apps/web/tailwind.config.js` maps semantic tokens through `theme.extend`.
  - [x] If `theme-default.css` is missing, stop and complete Story 5.1 first. Do not silently recreate the whole default-token story here.
- [x] Create the light theme stylesheet. (AC: 1, 3, 4, 5, 6, 8)
  - [x] Add `apps/web/public/theme-light.css`.
  - [x] Copy the complete variable API from `theme-default.css`.
  - [x] Use light background and surface values, dark text values, visible borders, and brand/status colors aligned with the default visual intent.
  - [x] Keep non-color tokens aligned with `theme-default.css` unless there is a documented readability reason to vary shadows or focus tokens.
- [x] Create the dark theme stylesheet. (AC: 2, 3, 4, 5, 7, 8)
  - [x] Add `apps/web/public/theme-dark.css`.
  - [x] Copy the exact same variable API as `theme-light.css`.
  - [x] Use dark background and surface values, light text values, stronger border contrast, and status colors tuned for dark surfaces.
  - [x] Keep channel-value syntax for semantic colors and valid CSS shadow values for dark elevation.
- [x] Validate token parity and CSS syntax. (AC: 3, 4, 5, 8, 10)
  - [x] Compare custom property names in `theme-default.css`, `theme-light.css`, and `theme-dark.css`; the sets must match unless a missing default token is explicitly corrected in the prerequisite story.
  - [x] Confirm no semantic color token is written as hex, named color, or wrapped `rgb(...)`.
  - [x] Confirm compatibility aliases remain parseable by `apps/web/src/app/globals.css`.
  - [x] Confirm both files contain only plain CSS.
- [x] Validate build impact. (AC: 8, 9, 10)
  - [x] Run `npm run type-check --workspace=apps/web`.
  - [x] Run `npm run build --workspace=apps/web` after type-check.
  - [x] Optional: temporarily link each stylesheet in browser/devtools or a local validation fixture to inspect variable values, then remove any temporary change before completion.

## Dev Notes

### Scope Boundaries

- This story creates two public CSS files only:
  - `apps/web/public/theme-light.css`
  - `apps/web/public/theme-dark.css`
- Do not update `apps/web/src/app/layout.tsx` to load a theme. Story 5.4 owns active theme selection and `<link>` insertion.
- Do not update `apps/web/tailwind.config.js` unless Story 5.2 is being completed first. This story assumes Tailwind mapping already exists when theme utility behavior is validated.
- Do not migrate component class names in `AppShell`, `TopMenu`, admin screens, auth screens, dashboard, customers, tasks, or preferences.
- Do not introduce Tailwind v4 `@theme`, `@import "tailwindcss"`, or `@custom-variant` syntax. The repo is on Tailwind CSS `^3.4.0` with a CommonJS `tailwind.config.js`.

### Current Code State

- At story creation time, `apps/web/public/theme-default.css`, `theme-light.css`, and `theme-dark.css` were not present in the working tree.
- `apps/web/tailwind.config.js` currently has `theme: { extend: {} }`, so Story 5.2 was also not implemented in code at story creation time.
- `apps/web/src/app/globals.css` defines only:
  - `--foreground-rgb`
  - `--background-start-rgb`
  - `--background-end-rgb`
  It uses these in `rgb(var(...))` body color/background declarations.
- `apps/web/src/app/layout.tsx` imports `./globals.css` and wraps the app in `AuthProvider`. Leave this file unchanged for this story.
- `apps/web/src/config/navigation.ts`, `AppShell.tsx`, and `TopMenu.tsx` still contain hardcoded `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*`, and `indigo-*` utilities. Full dark visual conversion requires later Tailwind mapping/loading/class migration work.

### Required Variable Contract

Use the complete variable set from `theme-default.css` once Story 5.1 is implemented. If Story 5.1 uses the planned contract, both theme files should include at least:

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

If Story 5.1 produced a different but complete semantic contract, follow the actual file instead of this planned sample.

### Suggested Light Theme Values

Use `theme-default.css` values if they already represent the light theme. Otherwise use this as the baseline:

```css
:root {
  --color-primary: 79 70 229;
  --color-primary-hover: 67 56 202;
  --color-primary-soft: 224 231 255;
  --color-primary-strong: 55 48 163;
  --color-secondary: 147 51 234;
  --color-secondary-hover: 126 34 206;
  --color-secondary-soft: 243 232 255;
  --color-accent: 37 99 235;

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

  --foreground-rgb: var(--color-text);
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}
```

### Suggested Dark Theme Values

Use the same non-color tokens as the default theme unless Story 5.1 changed the contract. Suggested dark color values:

```css
:root {
  --color-primary: 129 140 248;
  --color-primary-hover: 165 180 252;
  --color-primary-soft: 49 46 129;
  --color-primary-strong: 199 210 254;
  --color-secondary: 192 132 252;
  --color-secondary-hover: 216 180 254;
  --color-secondary-soft: 88 28 135;
  --color-accent: 96 165 250;

  --color-background: 15 23 42;
  --color-surface: 30 41 59;
  --color-surface-muted: 51 65 85;
  --color-surface-strong: 71 85 105;
  --color-text: 248 250 252;
  --color-text-muted: 203 213 225;
  --color-text-subtle: 148 163 184;
  --color-text-inverse: 15 23 42;

  --color-border: 51 65 85;
  --color-border-strong: 100 116 139;
  --color-focus-ring: 129 140 248;

  --color-danger: 248 113 113;
  --color-danger-soft: 69 10 10;
  --color-success: 74 222 128;
  --color-success-soft: 5 46 22;
  --color-warning: 251 191 36;
  --color-warning-soft: 69 26 3;
  --color-info: 96 165 250;
  --color-info-soft: 23 37 84;
  --color-overlay: 0 0 0;

  --foreground-rgb: var(--color-text);
  --background-start-rgb: 15, 23, 42;
  --background-end-rgb: 30, 41, 59;
}
```

Dark theme shadows should be subtle and visible on dark surfaces, for example:

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.35);
--shadow-md: 0 8px 16px -8px rgb(0 0 0 / 0.55);
--shadow-lg: 0 16px 32px -12px rgb(0 0 0 / 0.65);
--shadow-xl: 0 24px 48px -16px rgb(0 0 0 / 0.75);
```

### Implementation Guardrails

- Keep both theme files under `apps/web/public/`, because Next.js serves files from the app-level `public` folder from the site root.
- Use plain `:root` declarations. Do not use `.dark`, `[data-theme]`, media queries, or JavaScript-driven selectors in this story; config-driven loading comes next.
- Keep semantic token names identical across theme files. Theme loading can only work predictably if every stylesheet exposes the same API.
- Use contrast-aware choices. Minimum practical checks:
  - body background vs. text
  - surface vs. text
  - muted surface vs. muted/subtle text
  - primary/secondary/status colors against both background and surface
  - focus ring against background and surface
- Preserve `--letter-spacing-normal: 0`; do not introduce negative letter spacing.
- Keep `--spacing-unit` and named spacing/radius values stable across light and dark themes unless the prerequisite contract changed.
- Do not depend on Tailwind dark-mode variants for this story. Tailwind v3 dark variants are useful for class-based or media-based dark styling, but this project is using config-loaded CSS variable overrides for Epic 5.

### Validation Guidance

- Token parity check can be done with a small script or shell command that extracts CSS custom property names from the three theme files and compares sorted sets. Do not commit generated validation output.
- CSS syntax check options:
  - Build path: `npm run build --workspace=apps/web`
  - Focused parse: use a lightweight CSS parser only if already available; do not add a dependency just to parse two static files.
- TypeScript validation:
  - `npm run type-check --workspace=apps/web`
- If `npm run build --workspace=apps/web` fails for an unrelated existing issue, document the exact command and failure in Dev Agent Record.
- Manual visual verification is limited until Story 5.4 loads active themes. A temporary local link or browser devtools injection is acceptable during validation, but remove any temporary source edits before finishing.

### Previous Story Intelligence

- Story 5.1 owns the semantic CSS variable contract and `theme-default.css`.
- Story 5.1 established channel values for semantic colors so Story 5.2 can map Tailwind colors with opacity placeholders.
- Story 5.1 also established `--foreground-rgb`, `--background-start-rgb`, and `--background-end-rgb` as compatibility aliases for current `globals.css`.
- Story 5.2 owns mapping those CSS variables into `apps/web/tailwind.config.js` using `theme.extend`, while preserving all existing Tailwind defaults.
- Story 5.2 explicitly leaves active stylesheet loading to Story 5.4.
- At story creation time, both prior Epic 5 story files were `ready-for-dev`, not `done`, and their code artifacts were missing. The dev agent must verify prerequisites in the working tree before implementing this story.

### Architecture Compliance

- AD-08 requires Tailwind CSS 3.4.x plus CSS variables for brand colors, typography, spacing, and theme stylesheet overrides.
- AD-08 requires theme stylesheets named `public/theme-{name}.css` and loaded at startup.
- AD-07 and AD-08 require config-driven layout/theme decisions to be immutable during a session. This story must not add runtime switching.
- Keep changes under `apps/web/public/`; no BFF, Prisma, shared-types, auth, database, or route changes are required.
- Extend the existing theme system rather than introducing CSS-in-JS, component libraries, or a new theming package.

### Git Intelligence

- Recent commits are admin-panel focused, including non-JSON admin API response handling, audit trail logging, role-module mapping, and admin module management tabs.
- Relevant pattern: keep changes scoped, preserve existing tests, and avoid opportunistic UI rewrites while an infrastructure story is being implemented.
- Recent admin work added focused unit tests for new behavior. For this CSS-only story, token parity/build validation is more appropriate than React tests unless implementation touches TS/TSX.

### Latest Technical Information

- Tailwind CSS has a newer v4 line, but this repo depends on Tailwind `^3.4.0` and uses v3 PostCSS/config conventions. Do not migrate this story to Tailwind v4.
- Tailwind v4 changes the PostCSS and CLI packages, so introducing v4 syntax or commands would be incompatible with the current `postcss.config.js` and dependency set.
- Tailwind v3 dark-mode variants can use media or selector strategies, but Epic 5's architecture is config-loaded CSS variable stylesheets, not `dark:` class migration.
- Tailwind v3 theme configuration supports `theme.extend` to add project tokens while keeping defaults, which is why Story 5.2 must remain separate from this stylesheet-only story.
- Next.js serves files in `public` from the site root, so Story 5.4 can later reference these assets as `/theme-light.css` and `/theme-dark.css`.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md` - Epic 5, Story 5.3]
- [Source: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md` - FRx05 Themeable Styling]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md` - AD-08 Themeable Styling]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-DISCUSSION.md` - Themes: Why CSS Variables + Config-Driven?]
- [Source: `docs/project-context.md` - Technology Stack, React/Next.js, Tailwind, Testing Rules]
- [Source: `_bmad-output/implementation-artifacts/5-1-define-css-variables-for-theme-colors-fonts-spacing.md` - token contract and compatibility aliases]
- [Source: `_bmad-output/implementation-artifacts/5-2-integrate-css-variables-with-tailwind-config.md` - Tailwind mapping boundary and validation expectations]
- [Source: `apps/web/src/app/globals.css` - current legacy CSS variable usage]
- [Source: `apps/web/src/app/layout.tsx` - current global CSS import and root layout]
- [Source: `apps/web/tailwind.config.js` - current Tailwind config shape]
- [Source: `apps/web/postcss.config.js` - current Tailwind v3 PostCSS pipeline]
- [Source: `apps/web/src/config/navigation.ts`, `AppShell.tsx`, and `TopMenu.tsx` - current hardcoded UI classes]
- [Source: Tailwind CSS v3 Dark Mode - https://v3.tailwindcss.com/docs/dark-mode]
- [Source: Tailwind CSS v3 Customizing Colors - https://v3.tailwindcss.com/docs/customizing-colors]
- [Source: Tailwind CSS v3 Theme Configuration - https://v3.tailwindcss.com/docs/theme]
- [Source: Tailwind CSS v4 Upgrade Guide - https://tailwindcss.com/docs/upgrade-guide]
- [Source: Next.js public folder docs - https://nextjs.org/docs/app/api-reference/file-conventions/public-folder]

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

- 2026-07-30: Verified `apps/web/public/theme-default.css` exists and `apps/web/tailwind.config.js` maps semantic variables through `theme.extend`.
- 2026-07-30: Red check confirmed missing `apps/web/public/theme-light.css` before implementation.
- 2026-07-30: Added light and dark public theme stylesheets with a matching 69-token CSS variable API.
- 2026-07-30: Token parity and semantic syntax validation passed for `theme-default.css`, `theme-light.css`, and `theme-dark.css`.
- 2026-07-30: PostCSS parsed `theme-light.css` and `theme-dark.css` successfully.
- 2026-07-30: `npm.cmd run type-check --workspace=apps/web` passed.
- 2026-07-30: `npm.cmd run build --workspace=apps/web` failed under inherited `NODE_ENV=development`; rerun with `NODE_ENV=production` passed.
- 2026-07-30: `npm.cmd test` passed all configured unit and integration tests.
- 2026-07-30: `npm.cmd run lint --workspace=apps/web` failed because `next lint` is treated as an invalid project directory under the current Next.js 16 setup.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Created `theme-light.css` using the complete current default token contract, readable light surfaces, dark text, visible borders, and the existing indigo/purple brand intent.
- Created `theme-dark.css` with the same custom property names, dark surfaces, light text, stronger borders, visible focus rings, distinct status colors, and darker elevation shadows.
- Kept both stylesheets as plain `:root` CSS assets only; no stylesheet loading, Tailwind directives, JavaScript, TypeScript, imports, remote assets, fonts, selectors, or runtime theme switching were added.
- Validation confirmed token parity, semantic channel syntax, legacy globals compatibility aliases, CSS parsing, web type-check, production web build, and full unit/integration regression tests.
- Lint could not be evaluated because the existing `next lint` script is incompatible with the current Next.js 16 CLI behavior.

### File List

- `_bmad-output/implementation-artifacts/5-3-create-light-dark-themes.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/public/theme-dark.css`
- `apps/web/public/theme-light.css`

### Change Log

- 2026-07-30: Implemented Story 5.3 light and dark public theme stylesheets and validated token parity, CSS parsing, type-check, build, and regression tests.
