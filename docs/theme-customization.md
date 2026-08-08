# Theme Customization

Theme files override the CSS variables used by the web app. Normal branding changes should be made in static theme stylesheets, not by changing application code.

## Prerequisites

Custom themes assume the Epic 5 theme foundation is present:

- `apps/web/public/theme-default.css` defines the canonical variable contract.
- `apps/web/public/theme-light.css` and `apps/web/public/theme-dark.css` ship built-in themes.
- `apps/web/tailwind.config.js` maps semantic Tailwind tokens to CSS variables.
- `apps/web/src/config/theme.ts` and `apps/web/src/app/layout.tsx` load the configured theme stylesheet at startup.

## File Convention

Theme files live in `apps/web/public/` and are served from the site root by Next.js.

| Purpose | File | Requested URL |
| --- | --- | --- |
| Built-in light theme | `apps/web/public/theme-light.css` | `/theme-light.css` |
| Built-in dark theme | `apps/web/public/theme-dark.css` | `/theme-dark.css` |
| Custom template | `apps/web/public/theme-custom-example.css` | not loaded directly |
| Loaded custom theme | `apps/web/public/theme-custom.css` | `/theme-custom.css` |

The startup loader accepts lowercase slugs containing letters, digits, and hyphens. It resolves `THEME=<slug>` to `/theme-<slug>.css`. For example:

- `THEME=light` loads `/theme-light.css`.
- `THEME=dark` loads `/theme-dark.css`.
- `THEME=custom` loads `/theme-custom.css`.
- `THEME=acme-brand` loads `/theme-acme-brand.css`.

`THEME=custom` requires a real `apps/web/public/theme-custom.css` file. The `theme-custom-example.css` file is only a copyable template.

Invalid or missing theme names fall back to the default configured by `apps/web/src/config/theme.ts`.

## Create a Custom Theme

PowerShell:

```powershell
Copy-Item apps\web\public\theme-custom-example.css apps\web\public\theme-custom.css
$env:THEME = 'custom'
npm run dev:web
```

Bash:

```bash
cp apps/web/public/theme-custom-example.css apps/web/public/theme-custom.css
THEME=custom npm run dev:web
```

Then edit `apps/web/public/theme-custom.css` and change variable values. Keep variable names unchanged unless the canonical contract in `theme-default.css` changes.

For production deployments, make sure the custom stylesheet exists before the web app is built or packaged into a container image. After changing startup configuration or static theme assets, restart the dev server or rebuild and redeploy production assets.

The active theme name is startup configuration, not a runtime user preference. Do not use admin UI, cookies, localStorage, or client-side stylesheet swapping to change the active theme.

## Variable Reference

Colors use Tailwind 3 opacity-compatible RGB channel values without commas, hex values, named colors, or `rgb(...)` wrappers. For example:

```css
--color-primary: 14 116 144;
```

Use these groups as the supported variable API:

| Group | Variables |
| --- | --- |
| Brand colors | `--color-primary`, `--color-primary-hover`, `--color-primary-soft`, `--color-primary-strong`, `--color-secondary`, `--color-secondary-hover`, `--color-secondary-soft`, `--color-accent` |
| Surfaces and text | `--color-background`, `--color-surface`, `--color-surface-muted`, `--color-surface-strong`, `--color-text`, `--color-text-muted`, `--color-text-subtle`, `--color-text-inverse` |
| Borders and focus | `--color-border`, `--color-border-strong`, `--color-focus-ring`, `--border-color`, `--border-color-strong`, `--border-width`, `--focus-ring-width`, `--focus-ring-offset`, `--focus-ring-color` |
| Status colors | `--color-danger`, `--color-danger-soft`, `--color-success`, `--color-success-soft`, `--color-warning`, `--color-warning-soft`, `--color-info`, `--color-info-soft`, `--color-overlay` |
| Typography | `--font-family-body`, `--font-family-heading`, `--font-size-xs`, `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl`, `--font-weight-normal`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`, `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed`, `--letter-spacing-normal` |
| Spacing | `--spacing-unit`, `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`, `--spacing-xl`, `--spacing-2xl` |
| Shape | `--border-radius-sm`, `--border-radius`, `--border-radius-lg`, `--border-radius-xl`, `--border-radius-full` |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl` |
| Legacy aliases | `--foreground-rgb`, `--background-start-rgb`, `--background-end-rgb` |

Legacy aliases are consumed by `globals.css` through `rgb(var(...))`, so keep their comma-separated channel format.

## Validation

Before committing or deploying a custom theme:

1. Compare property names in your custom stylesheet with `apps/web/public/theme-default.css`; the sets should match.
2. Confirm the CSS has valid syntax and a single `:root` block unless the contract intentionally changes.
3. Confirm every semantic `--color-*` value uses space-separated RGB channels such as `14 116 144`.
4. Run the web app with the configured theme and check the browser network tab for `/theme-custom.css` or your `/theme-<slug>.css` file.
5. Check contrast for text, buttons, links, focus states, status colors, and disabled or muted states.
6. Run `npm run type-check --workspace=apps/web`.
7. Run `npm run build --workspace=apps/web`.

## Troubleshooting

If the app loads the light theme, verify the `THEME` value is present in the server process and matches the safe slug pattern: lowercase letters, digits, and hyphens only.

If the browser returns 404 for `/theme-custom.css`, verify the copied file is named `theme-custom.css`, not `theme-custom-example.css`.

If colors do not change, confirm the UI uses semantic Tailwind utilities from the theme mapping or CSS variables directly.

If changes do not appear after editing a theme file, restart the dev server or rebuild and redeploy production assets.

If text becomes hard to read, adjust the foreground, muted text, surface, and brand contrast pairs together rather than changing only one token.
