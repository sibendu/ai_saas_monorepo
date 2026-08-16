---
title: 'Configurable application name'
type: 'feature'
created: '2026-08-16'
status: 'done'
route: 'one-shot'
---

# Configurable application name

## Intent

**Problem:** The heading text “SaaS Platform” was fixed in several application shells.

**Approach:** Resolve `APP_NAME` once in the server layout, provide it to client shells through context, and fall back to “SaaS Platform” for absent or blank values.

## Suggested Review Order

**Configuration flow**

- Normalizes the environment value before it crosses the server-to-client boundary.
  [`layout.tsx:24`](../../apps/web/src/app/layout.tsx#L24)

- Provides the resolved name to every interactive shell without exposing `APP_NAME` to the browser.
  [`AppNameProvider.tsx:13`](../../apps/web/src/components/AppNameProvider.tsx#L13)

- Ensures missing or whitespace-only configuration retains the existing name.
  [`app-name.ts:3`](../../apps/web/src/lib/app-name.ts#L3)

**Heading consumers**

- Uses the shared value in left and top navigation branding.
  [`AppShell.tsx:205`](../../apps/web/src/components/AppShell.tsx#L205)

- Uses the same value on authentication screens.
  [`AuthPageShell.tsx:13`](../../apps/web/src/components/AuthPageShell.tsx#L13)

**Regression coverage**

- Confirms configured and blank values produce the expected heading text.
  [`Header.unit.test.tsx:39`](../../apps/web/src/tests/unit/Header.unit.test.tsx#L39)
