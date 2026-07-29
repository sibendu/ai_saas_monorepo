'use client'

import { FormEvent, useMemo, useState } from 'react'
import { ApiResponse, AdminRoleMutationRequest, AdminRolesData, AdminRoleSummary } from '@saas/shared-types'

interface RoleManagementProps {
  initialRoles: AdminRoleSummary[]
}

interface RoleFormState {
  name: string
  description: string
}

const emptyForm: RoleFormState = {
  name: '',
  description: '',
}

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>
}

export default function RoleManagement({ initialRoles }: RoleManagementProps) {
  const [roles, setRoles] = useState<AdminRoleSummary[]>(initialRoles)
  const [formState, setFormState] = useState<RoleFormState>(emptyForm)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<RoleFormState>(emptyForm)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const sortedRoles = useMemo(
    () => [...roles].sort((first, second) => first.name.localeCompare(second.name)),
    [roles]
  )

  async function refreshRoles() {
    const response = await fetch('/api/admin/roles', { cache: 'no-store' })
    const payload = await readApiResponse<AdminRolesData>(response)

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? 'Failed to refresh roles')
    }

    setRoles(payload.data.roles)
  }

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const requestBody: AdminRoleMutationRequest = {
        name: formState.name,
        description: formState.description,
      }
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const payload = await readApiResponse<AdminRoleSummary>(response)

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to create role')
      }

      setRoles((currentRoles) => [...currentRoles, payload.data as AdminRoleSummary])
      setFormState(emptyForm)
      setStatusMessage(payload.message ?? 'Role created successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create role')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateRole(roleId: string) {
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const requestBody: AdminRoleMutationRequest = {
        name: editingState.name,
        description: editingState.description,
      }
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const payload = await readApiResponse<AdminRoleSummary>(response)

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to update role')
      }

      setRoles((currentRoles) =>
        currentRoles.map((role) => (role.id === roleId ? (payload.data as AdminRoleSummary) : role))
      )
      setEditingRoleId(null)
      setEditingState(emptyForm)
      setStatusMessage(payload.message ?? 'Role updated successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update role')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteRole(role: AdminRoleSummary) {
    const shouldDelete = window.confirm(`Delete role "${role.name}"?`)

    if (!shouldDelete) {
      return
    }

    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
      })
      const payload = await readApiResponse<{ id: string }>(response)

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to delete role')
      }

      setRoles((currentRoles) => currentRoles.filter((currentRole) => currentRole.id !== role.id))
      setStatusMessage(payload.message ?? 'Role deleted successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete role')
      await refreshRoles().catch(() => undefined)
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(role: AdminRoleSummary) {
    setEditingRoleId(role.id)
    setEditingState({
      name: role.name,
      description: role.description ?? '',
    })
    setStatusMessage(null)
    setErrorMessage(null)
  }

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-lg shadow p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create and maintain the roles that drive module access.
            </p>
          </div>
          <form className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]" onSubmit={handleCreateRole}>
            <label className="sr-only" htmlFor="role-name">
              Role name
            </label>
            <input
              id="role-name"
              value={formState.name}
              onChange={(event) => setFormState((state) => ({ ...state, name: event.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Role name"
              disabled={isSaving}
            />
            <label className="sr-only" htmlFor="role-description">
              Description
            </label>
            <input
              id="role-description"
              value={formState.description}
              onChange={(event) =>
                setFormState((state) => ({ ...state, description: event.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Description"
              disabled={isSaving}
            />
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              disabled={isSaving}
            >
              Add role
            </button>
          </form>
        </div>

        {statusMessage && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{statusMessage}</p>
        )}
        {errorMessage && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        )}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Usage
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedRoles.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={4}>
                  No roles have been created yet.
                </td>
              </tr>
            ) : (
              sortedRoles.map((role) => {
                const isEditing = editingRoleId === role.id

                return (
                  <tr key={role.id} className="align-top">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {isEditing ? (
                        <input
                          value={editingState.name}
                          onChange={(event) =>
                            setEditingState((state) => ({ ...state, name: event.target.value }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          disabled={isSaving}
                        />
                      ) : (
                        role.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {isEditing ? (
                        <input
                          value={editingState.description}
                          onChange={(event) =>
                            setEditingState((state) => ({
                              ...state,
                              description: event.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          disabled={isSaving}
                        />
                      ) : (
                        role.description ?? 'No description'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span>{role.userCount} users</span>
                      <span className="mx-2 text-gray-300">/</span>
                      <span>{role.moduleCount} modules</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateRole(role.id)}
                              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                              disabled={isSaving}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRoleId(null)
                                setEditingState(emptyForm)
                              }}
                              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                              disabled={isSaving}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(role)}
                              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                              disabled={isSaving}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role)}
                              className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:text-red-300"
                              disabled={isSaving}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
