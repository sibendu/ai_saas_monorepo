# Requirements: Admin User Roles Multiselect Dropdown

## Overview

The Admin → Users tab currently shows each user's assigned roles as badge chips and exposes
all available roles as a grid of checkboxes that are always visible on screen. A separate
"Save roles" button submits the role changes independently of user-attribute edits (name,
email, company), which require a second "Save user" button after clicking "Edit".

This feature replaces that two-button, always-visible-checkbox experience with a unified
edit flow: roles are shown as a read-only comma-separated list in the table, and when the
admin clicks Edit the roles field becomes a multiselect dropdown — part of the same form
that saves both attributes and roles in a single action.

---

## Functional Requirements

### FR-1 — Read-only role display in the user table

- **FR-1.1** On page load the Users tab shall display all user records in the existing table.
- **FR-1.2** The Roles column shall display the user's currently assigned role names as a
  comma-separated string (e.g. `Admin, Editor`).
- **FR-1.3** When a user has no roles assigned the Roles column shall display `No roles assigned`.
- **FR-1.4** The role checkboxes and the standalone "Save roles" button that currently appear
  in the Roles column **shall be removed** from the read-only (non-editing) row view.

### FR-2 — Edit mode with unified save

- **FR-2.1** Each row shall retain a single "Edit" button that enters edit mode for that row.
- **FR-2.2** When edit mode is active the row shall render an inline form containing:
  - Name field (text input)
  - Email field (text input)
  - Company field (text input)
  - Roles field (multiselect dropdown — see FR-3)
  - "Save" button
  - "Cancel" button
- **FR-2.3** Clicking "Save" shall submit both user-attribute changes **and** role changes in
  a single user action.
- **FR-2.4** After a successful save the row shall return to read-only view with updated
  attribute and role values reflected immediately.
- **FR-2.5** Clicking "Cancel" shall discard all unsaved changes and return the row to
  read-only view.
- **FR-2.6** Only one row may be in edit mode at a time (consistent with current behaviour).

### FR-3 — Multiselect roles dropdown

- **FR-3.1** The roles field in edit mode shall be a single dropdown control that allows
  selecting zero or more roles simultaneously.
- **FR-3.2** On entering edit mode the dropdown shall pre-select the user's currently
  assigned roles.
- **FR-3.3** The dropdown shall list all available roles fetched from `availableRoles` prop.
- **FR-3.4** The dropdown shall display the names of all selected roles in its trigger/summary
  area (e.g. `Admin, Editor` or `2 roles selected` for longer lists).
- **FR-3.5** When no roles are selected the dropdown trigger shall display a placeholder such
  as `No roles selected`.
- **FR-3.6** The dropdown shall support keyboard navigation and be accessible (ARIA
  combobox / listbox pattern or equivalent).

### FR-4 — Save behaviour

- **FR-4.1** Clicking "Save" shall first call `PUT /api/admin/users/{userId}` with the updated
  name, email, and company.
- **FR-4.2** Only if FR-4.1 succeeds shall the client then call
  `PUT /api/admin/users/{userId}/roles` with the selected role IDs.
- **FR-4.3** If the attribute update (FR-4.1) fails, the roles update shall **not** be
  attempted and the error message shall be shown.
- **FR-4.4** If the roles update (FR-4.2) fails after a successful attribute update, the error
  shall be surfaced and the row shall remain in read-only view reflecting the attribute
  changes already saved.
- **FR-4.5** On complete success a single green status message shall be shown
  (e.g. `User and roles updated successfully`).

### FR-5 — No back-end changes

- **FR-5.1** The two existing API routes (`PUT /api/admin/users/{userId}` and
  `PUT /api/admin/users/{userId}/roles`) shall be called sequentially as described in FR-4;
  no new endpoints or schema migrations are required.

---

## Non-Functional Requirements

- **NFR-1 Accessibility** — The multiselect dropdown shall meet WCAG 2.1 AA keyboard and
  screen-reader requirements. All interactive elements must have visible focus indicators
  and appropriate ARIA labels.
- **NFR-2 Consistency** — The new dropdown must visually match the existing Tailwind CSS
  design language used across the Admin panel (indigo accent, gray borders, sm text size).
- **NFR-3 No new dependencies** — The multiselect shall be implemented with plain React and
  Tailwind CSS; no third-party dropdown library shall be introduced.
- **NFR-4 TypeScript strict mode** — All new and modified code must compile under
  `strict: true` with no implicit `any`.

---

## Out of Scope

- Creating or deleting users.
- Creating, editing, or deleting roles.
- Changing the behaviour of any other Admin tab (Roles, Module Management, etc.).
- Back-end / Prisma schema changes.
- Pagination or search within the Users table.
