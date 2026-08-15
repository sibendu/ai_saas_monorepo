'use client'

import { FormEvent, Fragment, useMemo, useState } from 'react'
import {
  AdminRoleSummary,
  AdminUserGroupUserAssignmentRequest,
  AdminUserGroupRoleAssignmentRequest,
  AdminUserGroupRolesData,
  AdminUserGroupMutationRequest,
  AdminUserGroupsData,
  AdminUserGroupUsersData,
  AdminUserGroupSummary,
  AdminUserSummary,
} from '@saas/shared-types'
import { readApiResponse } from '@/lib/client-api'
import RolesMultiSelect from './RolesMultiSelect'

interface UserGroupManagementProps {
  initialUserGroups: AdminUserGroupSummary[]
  initialUsers: AdminUserSummary[]
  availableRoles: AdminRoleSummary[]
}

interface UserGroupFormState {
  name: string
  description: string
}

const emptyForm: UserGroupFormState = {
  name: '',
  description: '',
}

export default function UserGroupManagement({
  initialUserGroups,
  initialUsers,
  availableRoles,
}: UserGroupManagementProps) {
  const [userGroups, setUserGroups] = useState<AdminUserGroupSummary[]>(initialUserGroups)
  const [formState, setFormState] = useState<UserGroupFormState>(emptyForm)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<UserGroupFormState>(emptyForm)
  const [assignmentGroupId, setAssignmentGroupId] = useState<string | null>(null)
  const [roleAssignmentGroupId, setRoleAssignmentGroupId] = useState<string | null>(null)
  const [assignedUsers, setAssignedUsers] = useState<AdminUserSummary[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)
  const [isLoadingRoleAssignments, setIsLoadingRoleAssignments] = useState(false)

  const sortedUserGroups = useMemo(
    () => [...userGroups].sort((first, second) => first.name.localeCompare(second.name)),
    [userGroups]
  )

  const selectedAssignmentGroup = useMemo(
    () => userGroups.find((group) => group.id === assignmentGroupId) ?? null,
    [assignmentGroupId, userGroups]
  )

  const assignableUsers = useMemo(() => {
    const assignedUserIds = new Set(assignedUsers.map((user) => user.id))
    const normalizedSearch = userSearch.trim().toLowerCase()

    return initialUsers
      .filter((user) => !assignedUserIds.has(user.id))
      .filter((user) => {
        if (!normalizedSearch) {
          return true
        }

        return `${user.name} ${user.email} ${user.company ?? ''}`
          .toLowerCase()
          .includes(normalizedSearch)
      })
      .sort((first, second) => first.email.localeCompare(second.email))
  }, [assignedUsers, initialUsers, userSearch])

  async function refreshUserGroups() {
    const response = await fetch('/api/admin/user-groups', { cache: 'no-store' })
    const payload = await readApiResponse<AdminUserGroupsData>(
      response,
      'Failed to refresh user groups'
    )

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? 'Failed to refresh user groups')
    }

    setUserGroups(payload.data.userGroups)
  }

  function applyAssignmentData(data: AdminUserGroupUsersData) {
    setAssignedUsers(data.users)
    setUserGroups((currentGroups) =>
      currentGroups.map((group) => (group.id === data.group.id ? data.group : group))
    )
  }

  function applyRoleAssignmentData(data: AdminUserGroupRolesData) {
    setSelectedRoleIds(data.roles.map((role) => role.id))
    setUserGroups((currentGroups) =>
      currentGroups.map((group) => (group.id === data.group.id ? data.group : group))
    )
  }

  async function loadAssignedUsers(group: AdminUserGroupSummary) {
    setAssignmentGroupId(group.id)
    setRoleAssignmentGroupId(null)
    setAssignedUsers([])
    setUserSearch('')
    setIsLoadingAssignments(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/user-groups/${group.id}/users`, {
        cache: 'no-store',
      })
      const payload = await readApiResponse<AdminUserGroupUsersData>(
        response,
        'Failed to load assigned users'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to load assigned users')
      }

      applyAssignmentData(payload.data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load assigned users')
    } finally {
      setIsLoadingAssignments(false)
    }
  }

  async function loadAssignedRoles(group: AdminUserGroupSummary) {
    setRoleAssignmentGroupId(group.id)
    setAssignmentGroupId(null)
    setSelectedRoleIds([])
    setIsLoadingRoleAssignments(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/user-groups/${group.id}/roles`, {
        cache: 'no-store',
      })
      const payload = await readApiResponse<AdminUserGroupRolesData>(
        response,
        'Failed to load assigned roles'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to load assigned roles')
      }

      applyRoleAssignmentData(payload.data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load assigned roles')
    } finally {
      setIsLoadingRoleAssignments(false)
    }
  }

  async function saveAssignedRoles() {
    if (!roleAssignmentGroupId) {
      return
    }

    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const requestBody: AdminUserGroupRoleAssignmentRequest = {
        roleIds: selectedRoleIds,
      }
      const response = await fetch(`/api/admin/user-groups/${roleAssignmentGroupId}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const payload = await readApiResponse<AdminUserGroupRolesData>(
        response,
        'Failed to update group roles'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to update group roles')
      }

      applyRoleAssignmentData(payload.data)
      setStatusMessage(payload.message ?? 'Group roles updated successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update group roles')
    } finally {
      setIsSaving(false)
    }
  }

  async function assignUserToGroup(userId: string) {
    if (!assignmentGroupId) {
      return
    }

    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const requestBody: AdminUserGroupUserAssignmentRequest = { userId }
      const response = await fetch(`/api/admin/user-groups/${assignmentGroupId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const payload = await readApiResponse<AdminUserGroupUsersData>(
        response,
        'Failed to assign user'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to assign user')
      }

      applyAssignmentData(payload.data)
      setUserSearch('')
      setStatusMessage(payload.message ?? 'User assigned successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to assign user')
    } finally {
      setIsSaving(false)
    }
  }

  async function removeUserFromGroup(userId: string) {
    if (!assignmentGroupId) {
      return
    }

    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const requestBody: AdminUserGroupUserAssignmentRequest = { userId }
      const response = await fetch(`/api/admin/user-groups/${assignmentGroupId}/users`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const payload = await readApiResponse<AdminUserGroupUsersData>(
        response,
        'Failed to remove user'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to remove user')
      }

      applyAssignmentData(payload.data)
      setStatusMessage(payload.message ?? 'User removed successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to remove user')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateUserGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const requestBody: AdminUserGroupMutationRequest = {
        name: formState.name,
        description: formState.description,
      }
      const response = await fetch('/api/admin/user-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const payload = await readApiResponse<AdminUserGroupSummary>(
        response,
        'Failed to create user group'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to create user group')
      }

      setUserGroups((currentGroups) => [...currentGroups, payload.data as AdminUserGroupSummary])
      setFormState(emptyForm)
      setStatusMessage(payload.message ?? 'User group created successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create user group')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateUserGroup(groupId: string) {
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const requestBody: AdminUserGroupMutationRequest = {
        name: editingState.name,
        description: editingState.description,
      }
      const response = await fetch(`/api/admin/user-groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const payload = await readApiResponse<AdminUserGroupSummary>(
        response,
        'Failed to update user group'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to update user group')
      }

      setUserGroups((currentGroups) =>
        currentGroups.map((group) =>
          group.id === groupId ? (payload.data as AdminUserGroupSummary) : group
        )
      )
      setEditingGroupId(null)
      setEditingState(emptyForm)
      setStatusMessage(payload.message ?? 'User group updated successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update user group')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteUserGroup(group: AdminUserGroupSummary) {
    const shouldDelete = window.confirm(`Delete user group "${group.name}"?`)

    if (!shouldDelete) {
      return
    }

    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/user-groups/${group.id}`, {
        method: 'DELETE',
      })
      const payload = await readApiResponse<{ id: string }>(response, 'Failed to delete user group')

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to delete user group')
      }

      setUserGroups((currentGroups) =>
        currentGroups.filter((currentGroup) => currentGroup.id !== group.id)
      )
      setStatusMessage(payload.message ?? 'User group deleted successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete user group')
      await refreshUserGroups().catch(() => undefined)
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(group: AdminUserGroupSummary) {
    setEditingGroupId(group.id)
    setAssignmentGroupId(null)
    setRoleAssignmentGroupId(null)
    setEditingState({
      name: group.name,
      description: group.description ?? '',
    })
    setStatusMessage(null)
    setErrorMessage(null)
  }

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-lg shadow p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Groups</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create and maintain reusable groups for organizing users.
            </p>
          </div>
          <form
            className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]"
            onSubmit={handleCreateUserGroup}
          >
            <label className="sr-only" htmlFor="user-group-name">
              User group name
            </label>
            <input
              id="user-group-name"
              value={formState.name}
              onChange={(event) =>
                setFormState((state) => ({ ...state, name: event.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Group name"
              disabled={isSaving}
            />
            <label className="sr-only" htmlFor="user-group-description">
              Description
            </label>
            <input
              id="user-group-description"
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
              Add group
            </button>
          </form>
        </div>

        {statusMessage && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {statusMessage}
          </p>
        )}
        {errorMessage && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Group
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Users
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Roles
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Updated
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedUserGroups.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                  No user groups have been created yet.
                </td>
              </tr>
            ) : (
              sortedUserGroups.map((group) => {
                const isEditing = editingGroupId === group.id

                return (
                  <Fragment key={group.id}>
                    <tr className="align-top">
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
                          group.name
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
                          group.description ?? 'No description'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{group.memberCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {group.roles.length > 0
                          ? group.roles.map((role) => role.name).join(', ')
                          : 'No roles assigned'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(group.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateUserGroup(group.id)}
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                                disabled={isSaving}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGroupId(null)
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
                                onClick={() => loadAssignedUsers(group)}
                                className="rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:text-indigo-300"
                                disabled={isSaving || isLoadingAssignments}
                              >
                                Assign User
                              </button>
                              <button
                                type="button"
                                onClick={() => loadAssignedRoles(group)}
                                className="rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:text-sky-300"
                                disabled={isSaving || isLoadingRoleAssignments}
                              >
                                Assign Role
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditing(group)}
                                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                                disabled={isSaving}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUserGroup(group)}
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
                    {assignmentGroupId === group.id && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                            <div>
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-gray-900">
                                  Assigned users for {selectedAssignmentGroup?.name}
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssignmentGroupId(null)
                                    setAssignedUsers([])
                                    setUserSearch('')
                                  }}
                                  className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100"
                                >
                                  Close
                                </button>
                              </div>
                              <div className="mt-3 divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
                                {isLoadingAssignments ? (
                                  <p className="px-3 py-4 text-sm text-gray-500">Loading users...</p>
                                ) : assignedUsers.length === 0 ? (
                                  <p className="px-3 py-4 text-sm text-gray-500">
                                    No users are assigned to this group.
                                  </p>
                                ) : (
                                  assignedUsers.map((user) => (
                                    <div
                                      key={user.id}
                                      className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {user.name}
                                        </p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeUserFromGroup(user.id)}
                                        className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:text-red-300"
                                        disabled={isSaving}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                            <div>
                              <label
                                className="text-sm font-semibold text-gray-900"
                                htmlFor={`group-user-search-${group.id}`}
                              >
                                Search users
                              </label>
                              <input
                                id={`group-user-search-${group.id}`}
                                value={userSearch}
                                onChange={(event) => setUserSearch(event.target.value)}
                                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                                placeholder="Name, email, or company"
                                disabled={isSaving || isLoadingAssignments}
                              />
                              <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white">
                                {assignableUsers.length === 0 ? (
                                  <p className="px-3 py-4 text-sm text-gray-500">
                                    No matching users available.
                                  </p>
                                ) : (
                                  assignableUsers.map((user) => (
                                    <button
                                      key={user.id}
                                      type="button"
                                      onClick={() => assignUserToGroup(user.id)}
                                      className="block w-full border-b border-gray-100 px-3 py-3 text-left last:border-b-0 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                                      disabled={isSaving || isLoadingAssignments}
                                    >
                                      <span className="block text-sm font-medium text-gray-900">
                                        {user.name}
                                      </span>
                                      <span className="block text-xs text-gray-500">
                                        {user.email}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {roleAssignmentGroupId === group.id && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 px-4 py-4">
                          <div className="rounded-md border border-gray-200 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                  Assigned roles for {group.name}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                  Users in this group receive access from these roles.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setRoleAssignmentGroupId(null)
                                  setSelectedRoleIds([])
                                }}
                                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                              >
                                Close
                              </button>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                              <div>
                                <label
                                  id={`group-roles-${group.id}-label`}
                                  className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
                                  htmlFor={`group-roles-${group.id}`}
                                >
                                  Roles
                                </label>
                                <RolesMultiSelect
                                  id={`group-roles-${group.id}`}
                                  availableRoles={availableRoles}
                                  selectedRoleIds={selectedRoleIds}
                                  onChange={setSelectedRoleIds}
                                  disabled={isSaving || isLoadingRoleAssignments}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={saveAssignedRoles}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                                disabled={isSaving || isLoadingRoleAssignments}
                              >
                                {isSaving ? 'Saving...' : 'Save roles'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
