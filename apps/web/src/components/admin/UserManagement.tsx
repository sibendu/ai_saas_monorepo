'use client'

import { FormEvent, useMemo, useState } from 'react'
import {
  AdminUserGroupAssignmentRequest,
  AdminUserGroupSummary,
  AdminUserMutationRequest,
  AdminUserSummary,
} from '@saas/shared-types'
import { readApiResponse } from '@/lib/client-api'
import GroupsMultiSelect from './GroupsMultiSelect'

interface UserManagementProps {
  initialUsers: AdminUserSummary[]
  availableGroups: AdminUserGroupSummary[]
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

function createFormState(user: AdminUserSummary): UserFormState {
  return {
    email: user.email,
    name: user.name,
    company: user.company ?? '',
  }
}

function formatStructuredName(user: AdminUserSummary): string {
  return [user.firstName, user.middleName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ') || user.name
}

export default function UserManagement({
  initialUsers,
  availableGroups,
}: UserManagementProps) {
  const [users, setUsers] = useState<AdminUserSummary[]>(initialUsers)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<UserFormState>(emptyForm)
  const [editingGroupIds, setEditingGroupIds] = useState<string[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const sortedUsers = useMemo(
    () => [...users].sort((first, second) => first.email.localeCompare(second.email)),
    [users]
  )

  async function handleSave(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault()
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      // Step 1: Update user attributes
      const requestBody: AdminUserMutationRequest = {
        email: editingState.email,
        name: editingState.name,
        company: editingState.company,
      }
      const attributesResponse = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const attributesPayload = await readApiResponse<AdminUserSummary>(attributesResponse, 'Failed to update user')

      if (!attributesResponse.ok || !attributesPayload.success || !attributesPayload.data) {
        throw new Error(attributesPayload.error ?? 'Failed to update user')
      }

      const userWithUpdatedAttributes = attributesPayload.data

      const groupsRequestBody: AdminUserGroupAssignmentRequest = {
        groupIds: editingGroupIds,
      }
      const groupsResponse = await fetch(`/api/admin/users/${userId}/groups`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupsRequestBody),
      })
      const groupsPayload = await readApiResponse<AdminUserSummary>(
        groupsResponse,
        'Failed to update groups'
      )

      if (!groupsResponse.ok || !groupsPayload.success || !groupsPayload.data) {
        setUsers((currentUsers) =>
          currentUsers.map((user) => (user.id === userId ? userWithUpdatedAttributes : user))
        )
        setEditingUserId(null)
        setEditingState(emptyForm)
        setEditingGroupIds([])
        setErrorMessage(
          groupsPayload.error ?? 'Failed to update groups. User details were saved.'
        )
        return
      }

      const finalUser = groupsPayload.data
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === userId ? finalUser : user))
      )
      setEditingUserId(null)
      setEditingState(emptyForm)
      setEditingGroupIds([])
      setStatusMessage('User and groups updated successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(user: AdminUserSummary) {
    setEditingUserId(user.id)
    setEditingState(createFormState(user))
    setEditingGroupIds(user.groups.map((group) => group.id))
    setStatusMessage(null)
    setErrorMessage(null)
  }

  function cancelEditing() {
    setEditingUserId(null)
    setEditingState(emptyForm)
    setEditingGroupIds([])
  }

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-lg shadow p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          <p className="mt-1 text-sm text-gray-500">
            Maintain user profile details and assign users to groups.
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
                Name (First, Middle, Last)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Groups
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedUsers.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                  No users were found.
                </td>
              </tr>
            ) : (
              sortedUsers.map((user) => {
                const isEditing = editingUserId === user.id

                return (
                  <tr key={user.id} className="align-top">
                    {isEditing ? (
                      <td className="px-4 py-3 text-sm text-gray-600" colSpan={5}>
                        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]" onSubmit={(event) => handleSave(event, user.id)}>
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
                          <div>
                            <label id={`user-groups-${user.id}-label`} className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor={`user-groups-${user.id}`}>
                              Groups
                            </label>
                            <GroupsMultiSelect
                              id={`user-groups-${user.id}`}
                              availableGroups={availableGroups}
                              selectedGroupIds={editingGroupIds}
                              onChange={setEditingGroupIds}
                              disabled={isSaving}
                            />
                          </div>
                          <div className="flex items-end justify-end gap-2">
                            <button
                              type="submit"
                              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                              disabled={isSaving}
                            >
                              {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
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
                          <p className="font-medium text-gray-900">{formatStructuredName(user)}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.company ?? 'No company'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.groups.length > 0
                            ? user.groups.map((group) => group.name).join(', ')
                            : 'No groups assigned'}
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
