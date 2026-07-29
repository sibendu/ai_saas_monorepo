'use client'

import { FormEvent, useMemo, useState } from 'react'
import { ApiResponse, AdminUserMutationRequest, AdminUserSummary } from '@saas/shared-types'

interface UserManagementProps {
  initialUsers: AdminUserSummary[]
}

interface UserFormState {
  email: string
  name: string
  company: string
}

const emptyForm: UserFormState = {
  email: '',
  name: '',
  company: '',
}

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>
}

function createFormState(user: AdminUserSummary): UserFormState {
  return {
    email: user.email,
    name: user.name,
    company: user.company ?? '',
  }
}

export default function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<AdminUserSummary[]>(initialUsers)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<UserFormState>(emptyForm)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const sortedUsers = useMemo(
    () => [...users].sort((first, second) => first.email.localeCompare(second.email)),
    [users]
  )

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault()
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const requestBody: AdminUserMutationRequest = {
        email: editingState.email,
        name: editingState.name,
        company: editingState.company,
      }
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const payload = await readApiResponse<AdminUserSummary>(response)

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to update user')
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === userId ? (payload.data as AdminUserSummary) : user))
      )
      setEditingUserId(null)
      setEditingState(emptyForm)
      setStatusMessage(payload.message ?? 'User updated successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(user: AdminUserSummary) {
    setEditingUserId(user.id)
    setEditingState(createFormState(user))
    setStatusMessage(null)
    setErrorMessage(null)
  }

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-lg shadow p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          <p className="mt-1 text-sm text-gray-500">
            Maintain user profile details and verify assigned roles.
          </p>
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
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Roles
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedUsers.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={4}>
                  No users were found.
                </td>
              </tr>
            ) : (
              sortedUsers.map((user) => {
                const isEditing = editingUserId === user.id

                return (
                  <tr key={user.id} className="align-top">
                    {isEditing ? (
                      <td className="px-4 py-3 text-sm text-gray-600" colSpan={4}>
                        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={(event) => handleUpdateUser(event, user.id)}>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor={`user-name-${user.id}`}>
                              Name
                            </label>
                            <input
                              id={`user-name-${user.id}`}
                              value={editingState.name}
                              onChange={(event) =>
                                setEditingState((state) => ({ ...state, name: event.target.value }))
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                              disabled={isSaving}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor={`user-email-${user.id}`}>
                              Email
                            </label>
                            <input
                              id={`user-email-${user.id}`}
                              value={editingState.email}
                              onChange={(event) =>
                                setEditingState((state) => ({ ...state, email: event.target.value }))
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                              disabled={isSaving}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor={`user-company-${user.id}`}>
                              Company
                            </label>
                            <input
                              id={`user-company-${user.id}`}
                              value={editingState.company}
                              onChange={(event) =>
                                setEditingState((state) => ({
                                  ...state,
                                  company: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                              disabled={isSaving}
                            />
                          </div>
                          <div className="flex items-end justify-end gap-2">
                            <button
                              type="submit"
                              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                              disabled={isSaving}
                            >
                              {isSaving ? 'Saving...' : 'Save user'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(null)
                                setEditingState(emptyForm)
                              }}
                              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                              disabled={isSaving}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="mt-1 text-gray-500">{user.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.company ?? 'No company'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.roles.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {user.roles.map((role) => (
                                <span
                                  key={role.id}
                                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                                >
                                  {role.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            'No roles assigned'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => startEditing(user)}
                              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                              disabled={isSaving}
                              aria-label={`Edit ${user.name}`}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </>
                    )}
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
