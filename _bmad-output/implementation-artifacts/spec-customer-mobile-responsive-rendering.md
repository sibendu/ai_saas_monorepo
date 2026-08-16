---
title: 'Customer mobile-responsive rendering'
type: 'bugfix'
created: '2026-08-16'
status: 'done'
review_loop_iteration: 0
baseline_commit: '6d6c421021f9c9bae7a8fb58b7ae2df34de33048'
context:
  - '{project-root}/docs/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Customers data grid shows seven columns in a fixed-width table and clips its contents on narrow displays, making customer information and actions difficult to use on phones.

**Approach:** Render compact customer cards for phone-sized viewports while retaining the existing table for wider screens. Cover both renderings with focused unit checks and verify the page at a mobile viewport.

## Boundaries & Constraints

**Always:** Preserve the current customer filtering, pagination, add/edit/delete behavior, desktop table content, accessibility labels, and existing visual conventions.

**Ask First:** Changing customer data fields, API contracts, pagination semantics, or the desktop information hierarchy.

**Never:** Add dependencies, alter backend behavior, modify unrelated uncommitted work, or make administrative screens part of this change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Mobile list | A populated customer list at a viewport below `sm` | Each customer appears as a readable card with contact details, status, creation date, and actions | Long text wraps or truncates without horizontal page overflow |
| Desktop list | A populated customer list at `sm` or wider | The current columnar table remains available with its existing actions | N/A |
| Empty list | No matching customers at either viewport | The existing empty-state message remains visible | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/CustomersList.tsx` -- customer search, editor, list, pagination, and table rendering.
- `apps/web/src/tests/unit/CustomersList.unit.test.tsx` -- focused component behavior tests.
- `apps/web/playwright.config.ts` -- browser test configuration used for the mobile QA pass.

## Tasks & Acceptance

**Execution:**

- [x] `apps/web/src/components/CustomersList.tsx` -- add a small-screen card list and show the existing table only at `sm` and above -- retains all data and actions without forcing a horizontally compressed table.
- [x] `apps/web/src/tests/unit/CustomersList.unit.test.tsx` -- assert the compact presentation includes customer details and uses the existing edit/delete actions -- protects against losing essential mobile functionality.
- [x] Mobile QA -- run the focused test suite, type check, and Playwright/mobile viewport inspection -- verifies no horizontal overflow and that controls remain reachable.

**Acceptance Criteria:**

- Given a phone-width viewport with customers, when the list renders, then a user can read each customer’s name, company, email, phone, status, creation date, and activate Edit or Delete without horizontal page scrolling.
- Given a viewport at least `sm` wide, when the list renders, then the existing customer table and its columns remain available.
- Given an empty search result, when the customer screen renders at either viewport, then it retains the existing “No customers found” message.

## Verification

**Commands:**

- `npm run test:unit --workspace=apps/web -- CustomersList.unit.test.tsx` -- expected: focused customer tests pass.
- `npm run type-check --workspace=apps/web` -- expected: no TypeScript errors.
- `npm run test:e2e --workspace=apps/web` -- expected: Playwright mobile check passes when environment services are available.

## Suggested Review Order

**Mobile customer presentation**

- Phone-only cards retain every customer detail and expose comfortably sized actions.
  [`CustomersList.tsx:405`](../../apps/web/src/components/CustomersList.tsx#L405)

- The desktop table remains available from `sm`, with safe horizontal scrolling for constrained widths.
  [`CustomersList.tsx:453`](../../apps/web/src/components/CustomersList.tsx#L453)

**Regression coverage**

- Tests verify card content, desktop-table presence, and mobile edit behavior.
  [`CustomersList.unit.test.tsx:14`](../../apps/web/src/tests/unit/CustomersList.unit.test.tsx#L14)
