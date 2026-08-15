# Tasks: Admin User Roles Multiselect Dropdown

## Overview

Implementation is split into four sequential tasks. All changes live in
`apps/web/src/components/admin/`. No API, database, or shared-type changes are needed.

---

- [x] **Task 1 — Create `RolesMultiSelect` component**

  Create `apps/web/src/components/admin/RolesMultiSelect.tsx` as a self-contained,
  accessible multiselect dropdown.

  Acceptance criteria:
  - Accepts props: `id: string`, `availableRoles: AdminRoleSummary[]`,
    `selectedRoleIds: string[]`, `onChange: (roleIds: string[]) => void`,
    `disabled?: boolean`
  - Trigger button shows a comma-separated list of selected role names when ≤ 3 roles are
    selected, `"{n} roles selected"` when > 3, and `"No roles selected"` when empty
  - Clicking the trigger toggles the dropdown panel open/closed
  - Clicking an option toggles that role id in/out of `selectedRoleIds` and calls `onChange`
  - Clicking outside the panel closes it (via `useEffect` + `mousedown` listener on
    `document`)
  - `Escape` key closes the panel and returns focus to the trigger
  - `Enter`/`Space` on a focused option toggles that option
  - `Tab` away closes the panel
  - ARIA attributes applied: trigger has `aria-haspopup="listbox"` and
    `aria-expanded={isOpen}`; panel has `role="listbox"` and
    `aria-multiselectable="true"`; each option has `role="option"` and
    `aria-selected={isSelected}`
  - Visual checkmark (inline SVG) appears next to selected options
  - Inline chevron SVG on trigger rotates when panel is open
  - All Tailwind classes match the existing admin panel style (indigo accent, gray borders,
    `text-sm`)
  - `disabled` prop disables trigger and prevents panel from opening
  - Compiles under `strict: true` with no implicit `any`

---

- [x] **Task 2 — Refactor `UserManagement` state model**

  Update state declarations and helper functions in
  `apps/web/src/components/admin/UserManagement.tsx`.

  Acceptance criteria:
  - `roleSelections: Record<string, string[]>` state is **removed**
  - `savingRolesUserId: string | null` state is **removed**
  - `editingRoleIds: string[]` state is **added** (initialises to `[]`)
  - `startEditing(user)` populates `editingRoleIds` with the user's current role ids
    (`user.roles.map(r => r.id)`)
  - A `cancelEditing()` helper (or equivalent inline logic) resets `editingUserId`,
    `editingState`, and `editingRoleIds` back to their empty defaults
  - `toggleRoleSelection` function is **removed**
  - `handleUpdateRoles` function is **removed**
  - `handleUpdateUser` function is **removed** (to be replaced in Task 3)
  - Component still renders without runtime errors after this refactor (interim state —
    edit form and save button may be temporarily broken until Task 3)
  - No TypeScript errors under `strict: true`

---

- [x] **Task 3 — Implement unified `handleSave` and wire up edit form**

  Replace the removed save handlers with a single `handleSave` and update the edit-row JSX
  in `UserManagement.tsx`.

  Acceptance criteria:
  - `handleSave(event, userId)` calls `PUT /api/admin/users/{userId}` first; on failure it
    sets `errorMessage` and does **not** proceed to the roles call
  - On attribute-update success, `handleSave` calls
    `PUT /api/admin/users/{userId}/roles` with `{ roleIds: editingRoleIds }`
  - On complete success: users list is updated with the final `AdminUserSummary` returned
    by the roles endpoint, edit mode is exited, and `statusMessage` is set to
    `'User and roles updated successfully'`
  - On roles-only failure (attributes already saved): the user row is updated with the
    attribute-updated data from step 1, edit mode is exited, and `errorMessage` is set from
    the roles API error
  - `isSaving` is `true` while either fetch is in-flight and `false` in the `finally` block
  - The edit-row `<form>` calls `handleSave` via `onSubmit`
  - The edit-row grid is updated to
    `lg:grid-cols-[1fr_1fr_1fr_1fr_auto]` to accommodate the new Roles field
  - A Roles field is added to the edit form containing:
    - A `<label>` with `htmlFor={`user-roles-${user.id}`}` and text `"Roles"`
    - `<RolesMultiSelect>` with `id`, `availableRoles`, `selectedRoleIds={editingRoleIds}`,
      `onChange={setEditingRoleIds}`, and `disabled={isSaving}`
  - Save button label is `"Saving…"` while `isSaving` is `true`, otherwise `"Save"`
  - Cancel button calls `cancelEditing()` and is disabled while `isSaving` is `true`
  - No TypeScript errors under `strict: true`

---

- [x] **Task 4 — Update read-only row and clean up**

  Update the read-only (non-editing) row in `UserManagement.tsx` and remove all leftover
  code from the old role-checkbox experience.

  Acceptance criteria:
  - The Roles column in the read-only row displays
    `user.roles.map(r => r.name).join(', ')` when the user has at least one role
  - When the user has no roles the Roles column displays `"No roles assigned"` as plain
    text (no badge chips)
  - The role badge chip `<span>` elements are **removed** from the read-only row
  - The `<fieldset>` / `<legend>` checkbox block is **removed** from the read-only row
  - The `"Save roles"` button is **removed** entirely (it no longer exists anywhere in the
    component)
  - Any imports that are no longer referenced (`AdminUserRoleAssignmentRequest` if unused
    elsewhere, etc.) are removed to keep the file clean
  - The component compiles with no TypeScript errors and no ESLint warnings
  - Manual smoke-test: table loads showing roles as comma-separated text; Edit opens form
    with multiselect pre-populated; Save updates both attributes and roles; Cancel discards
    changes; error states surface correctly for both failure modes described in Task 3
