# Design: Admin User Roles Multiselect Dropdown

## Overview

All changes are confined to a single client component:
`apps/web/src/components/admin/UserManagement.tsx`.

No new API routes, Prisma schema changes, or shared-type modifications are needed. The
back-end already exposes two independent PUT endpoints; this feature simply sequences them
inside the unified save handler and replaces the checkbox UI with a multiselect dropdown.

---

## Component Architecture

### Files changed

| File | Change |
|------|--------|
| `apps/web/src/components/admin/UserManagement.tsx` | Major refactor — state model, save handler, JSX |
| `apps/web/src/components/admin/RolesMultiSelect.tsx` | **New** — self-contained multiselect dropdown |

No other files require modification.

---

## State Model Changes (`UserManagement.tsx`)

### Removed state

```typescript
// REMOVE — role selections no longer tracked per-row outside edit mode
const [roleSelections, setRoleSelections] = useState<Record<string, string[]>>(...)
// REMOVE — separate saving indicator for roles
const [savingRolesUserId, setSavingRolesUserId] = useState<string | null>(null)
```

### Added state

```typescript
// Roles selected while a row is being edited (only populated during edit mode)
const [editingRoleIds, setEditingRoleIds] = useState<string[]>([])
```

### `startEditing` — updated

```typescript
function startEditing(user: AdminUserSummary) {
  setEditingUserId(user.id)
  setEditingState(createFormState(user))
  setEditingRoleIds(user.roles.map((role) => role.id))  // pre-populate from user
  setStatusMessage(null)
  setErrorMessage(null)
}
```

### `cancelEditing` — updated

```typescript
function cancelEditing() {
  setEditingUserId(null)
  setEditingState(emptyForm)
  setEditingRoleIds([])
}
```

---

## Unified Save Handler

The two sequential API calls replace the current `handleUpdateUser` + `handleUpdateRoles`
pair. A single `handleSave` drives both:

```
handleSave(userId)
  │
  ├─ PUT /api/admin/users/{userId}          ← attributes
  │    ├─ on failure → set error, abort
  │    └─ on success → updatedUser from response
  │
  └─ PUT /api/admin/users/{userId}/roles    ← roles
       ├─ on failure → set error, exit edit mode (attributes already saved)
       └─ on success → merge updatedUser into users list, exit edit mode,
                       set success message "User and roles updated successfully"
```

```typescript
async function handleSave(event: FormEvent<HTMLFormElement>, userId: string) {
  event.preventDefault()
  setIsSaving(true)
  setStatusMessage(null)
  setErrorMessage(null)

  try {
    // Step 1 — update attributes
    const attrResponse = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: editingState.email,
        name: editingState.name,
        company: editingState.company,
      } satisfies AdminUserMutationRequest),
    })
    const attrPayload = await readApiResponse<AdminUserSummary>(attrResponse, 'Failed to update user')
    if (!attrResponse.ok || !attrPayload.success || !attrPayload.data) {
      throw new Error(attrPayload.error ?? 'Failed to update user')
    }

    // Step 2 — update roles
    const rolesResponse = await fetch(`/api/admin/users/${userId}/roles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleIds: editingRoleIds } satisfies AdminUserRoleAssignmentRequest),
    })
    const rolesPayload = await readApiResponse<AdminUserSummary>(rolesResponse, 'Failed to update roles')

    const finalUser = rolesPayload.success && rolesPayload.data
      ? rolesPayload.data
      : attrPayload.data  // roles failed but attributes succeeded — reflect partial state

    setUsers((current) => current.map((u) => (u.id === userId ? finalUser : u)))
    cancelEditing()

    if (!rolesResponse.ok || !rolesPayload.success) {
      throw new Error(rolesPayload.error ?? 'Failed to update user roles')
    }

    setStatusMessage('User and roles updated successfully')
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
  } finally {
    setIsSaving(false)
  }
}
```

---

## `RolesMultiSelect` Component

A purpose-built, no-library multiselect implemented as a controlled dropdown with a custom
panel. Follows the ARIA `listbox` + `button` pattern.

### Props

```typescript
interface RolesMultiSelectProps {
  id: string                        // for <label htmlFor={id}>
  availableRoles: AdminRoleSummary[]
  selectedRoleIds: string[]
  onChange: (roleIds: string[]) => void
  disabled?: boolean
}
```

### Behaviour

| Scenario | Result |
|----------|--------|
| Click trigger button | Toggle dropdown panel open/closed |
| Click role option | Toggle that role in/out of selection |
| Click outside panel | Close panel |
| Press `Escape` | Close panel, return focus to trigger |
| Press `Enter`/`Space` on option | Toggle that role |
| `Tab` away | Close panel |

### Trigger label logic

```typescript
function getTriggerLabel(selectedRoleIds: string[], availableRoles: AdminRoleSummary[]): string {
  if (selectedRoleIds.length === 0) return 'No roles selected'
  const names = availableRoles
    .filter((r) => selectedRoleIds.includes(r.id))
    .map((r) => r.name)
  return names.length <= 3 ? names.join(', ') : `${names.length} roles selected`
}
```

### Accessibility attributes

```
trigger <button>
  aria-haspopup="listbox"
  aria-expanded={isOpen}
  aria-labelledby="<label-id> <trigger-id>"

panel <ul>
  role="listbox"
  aria-multiselectable="true"
  aria-label="Select roles"

option <li>
  role="option"
  aria-selected={isSelected}
  tabIndex={0}
```

### Visual structure (Tailwind)

```
<div className="relative">
  {/* Trigger */}
  <button
    type="button"
    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm
               text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none
               focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
  >
    {triggerLabel}
    <ChevronIcon />  {/* inline SVG, stroke-based */}
  </button>

  {/* Panel */}
  {isOpen && (
    <ul
      className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border
                 border-gray-200 bg-white py-1 shadow-lg"
    >
      {availableRoles.map((role) => (
        <li
          className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm
                     hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none"
        >
          <span className="h-4 w-4 ...">  {/* checkmark icon when selected */}
          {role.name}
        </li>
      ))}
    </ul>
  )}
</div>
```

---

## Edit Row JSX — Updated Layout

The inline form grid gains a fourth column for roles, replacing the removed checkbox
fieldset. The layout adapts to wider screens to accommodate the new field:

```
lg:grid-cols-[1fr_1fr_1fr_1fr_auto]
           name  email company roles  actions
```

```tsx
{/* Roles field — replaces checkbox fieldset */}
<div>
  <label
    className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
    htmlFor={`user-roles-${user.id}`}
  >
    Roles
  </label>
  <RolesMultiSelect
    id={`user-roles-${user.id}`}
    availableRoles={availableRoles}
    selectedRoleIds={editingRoleIds}
    onChange={setEditingRoleIds}
    disabled={isSaving}
  />
</div>
```

---

## Read-Only Row — Roles Column

Replace the current chip badges + checkbox fieldset block with a simple text display:

```tsx
<td className="px-4 py-3 text-sm text-gray-600">
  {user.roles.length > 0
    ? user.roles.map((r) => r.name).join(', ')
    : 'No roles assigned'}
</td>
```

---

## Removed Elements

| Element | Reason |
|---------|--------|
| `roleSelections` state | No longer needed — roles only tracked during edit |
| `savingRolesUserId` state | Merged into single `isSaving` flag |
| `toggleRoleSelection` function | Replaced by `setEditingRoleIds` callback |
| `handleUpdateRoles` function | Merged into `handleSave` |
| `handleUpdateUser` function | Renamed / replaced by `handleSave` |
| Role badge chips in read-only row | Replaced by comma-separated text |
| Checkbox fieldset in Roles column | Replaced by `RolesMultiSelect` in edit form |
| "Save roles" button | Removed entirely |

---

## Error & Status Messages

No change to the existing message layout — the same green/red banners above the table are
reused. The only wording change is the success string:

| Before | After |
|--------|-------|
| `'User updated successfully'` | `'User and roles updated successfully'` |
| `'User roles updated successfully'` | (removed — folded into the line above) |

Partial-failure wording (attributes saved but roles failed):

> `'Failed to update user roles'` — surfaced from the roles API error response.

---

## Data Flow Diagram

```
AdminPage (server component)
  └─ AdminManagementTabs
       └─ UserManagement (client)
            ├─ props: initialUsers: AdminUserSummary[], availableRoles: AdminRoleSummary[]
            │
            ├─ [read-only row]
            │    └─ Roles column: user.roles.map(r => r.name).join(', ')
            │
            └─ [edit row — active for one user at a time]
                 ├─ Name / Email / Company inputs  ──┐
                 └─ RolesMultiSelect                 ├─ handleSave()
                      ├─ availableRoles (prop)        │   ├─ PUT /api/admin/users/{id}
                      ├─ selectedRoleIds (state)      │   └─ PUT /api/admin/users/{id}/roles
                      └─ onChange → setEditingRoleIds─┘
```

---

## Assumptions & Constraints

- `availableRoles` is passed in as a prop at mount time and does not need to be re-fetched
  during the session (consistent with current behaviour).
- The `RolesMultiSelect` panel is positioned absolutely within the table cell; no portal
  is needed given the table is not `overflow: hidden`.
- The chevron and checkmark icons are inline SVG (stroke-based) matching the AppShell icon
  pattern — no icon library import.
- On mobile (`< lg`) the edit form stacks vertically, same as the current behaviour.
