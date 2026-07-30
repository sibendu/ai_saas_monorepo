'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdminModuleSummary,
  AdminRoleModuleMappingData,
  AdminRoleModuleMappingRequest,
  AdminRoleSummary,
} from '@saas/shared-types'
import { readApiResponse } from '@/lib/client-api'

interface RoleModuleManagementProps {
  initialRoles: AdminRoleSummary[]
  initialModules: AdminModuleSummary[]
}

interface MappingSelection {
  moduleIds: string[]
  subModuleIds: string[]
}

const emptySelection: MappingSelection = {
  moduleIds: [],
  subModuleIds: [],
}

function sortStringIds(ids: string[]): string[] {
  return [...ids].sort((left, right) => Number(left) - Number(right))
}

function normalizeSelection(selection: MappingSelection): MappingSelection {
  return {
    moduleIds: sortStringIds([...new Set(selection.moduleIds)]),
    subModuleIds: sortStringIds([...new Set(selection.subModuleIds)]),
  }
}

function toSelection(mapping: AdminRoleModuleMappingData): MappingSelection {
  return normalizeSelection({
    moduleIds: mapping.moduleIds,
    subModuleIds: mapping.subModuleIds,
  })
}

export default function RoleModuleManagement({
  initialRoles,
  initialModules,
}: RoleModuleManagementProps) {
  const [roles, setRoles] = useState<AdminRoleSummary[]>(initialRoles)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialRoles[0]?.id ?? null)
  const [selection, setSelection] = useState<MappingSelection>(emptySelection)
  const [persistedMappings, setPersistedMappings] = useState<Record<string, MappingSelection>>({})
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  )

  const sortedRoles = useMemo(
    () => [...roles].sort((first, second) => first.name.localeCompare(second.name)),
    [roles]
  )

  useEffect(() => {
    if (!selectedRoleId) {
      return
    }

    const roleId = selectedRoleId
    let isCurrentRequest = true

    async function loadRoleMapping() {
      setIsLoading(true)
      setStatusMessage(null)
      setErrorMessage(null)
      setSelection(emptySelection)

      try {
        const response = await fetch(`/api/admin/roles/${roleId}/modules`, {
          cache: 'no-store',
        })
        const payload = await readApiResponse<AdminRoleModuleMappingData>(
          response,
          'Failed to load role module access'
        )

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? 'Failed to load role module access')
        }

        if (!isCurrentRequest) {
          return
        }

        const loadedSelection = toSelection(payload.data)

        setSelection(loadedSelection)
        setPersistedMappings((currentMappings) => ({
          ...currentMappings,
          [roleId]: loadedSelection,
        }))
      } catch (error) {
        if (!isCurrentRequest) {
          return
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load role module access'
        )
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false)
        }
      }
    }

    void loadRoleMapping()

    return () => {
      isCurrentRequest = false
    }
  }, [selectedRoleId])

  function handleRoleChange(roleId: string) {
    setSelectedRoleId(roleId)
  }

  function toggleModule(moduleId: string) {
    setSelection((currentSelection) => {
      const isSelected = currentSelection.moduleIds.includes(moduleId)
      const nextSelection = isSelected
        ? {
            moduleIds: currentSelection.moduleIds.filter(
              (selectedModuleId) => selectedModuleId !== moduleId
            ),
            subModuleIds: currentSelection.subModuleIds.filter((selectedSubModuleId) => {
              const parentModule = initialModules.find((module) => module.id === moduleId)

              return !parentModule?.subModules.some(
                (subModule) => subModule.id === selectedSubModuleId
              )
            }),
          }
        : {
            ...currentSelection,
            moduleIds: [...currentSelection.moduleIds, moduleId],
          }

      return normalizeSelection(nextSelection)
    })
    setStatusMessage(null)
    setErrorMessage(null)
  }

  function toggleSubModule(moduleId: string, subModuleId: string) {
    setSelection((currentSelection) => {
      const isSelected = currentSelection.subModuleIds.includes(subModuleId)
      const nextSelection = isSelected
        ? {
            ...currentSelection,
            subModuleIds: currentSelection.subModuleIds.filter(
              (selectedSubModuleId) => selectedSubModuleId !== subModuleId
            ),
          }
        : {
            moduleIds: currentSelection.moduleIds.includes(moduleId)
              ? currentSelection.moduleIds
              : [...currentSelection.moduleIds, moduleId],
            subModuleIds: [...currentSelection.subModuleIds, subModuleId],
          }

      return normalizeSelection(nextSelection)
    })
    setStatusMessage(null)
    setErrorMessage(null)
  }

  async function handleSave() {
    if (!selectedRoleId || !selectedRole) {
      return
    }

    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const requestBody: AdminRoleModuleMappingRequest = normalizeSelection(selection)
      const response = await fetch(`/api/admin/roles/${selectedRoleId}/modules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      const payload = await readApiResponse<AdminRoleModuleMappingData>(
        response,
        'Failed to update role module access'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to update role module access')
      }

      const savedSelection = toSelection(payload.data)

      setSelection(savedSelection)
      setPersistedMappings((currentMappings) => ({
        ...currentMappings,
        [selectedRoleId]: savedSelection,
      }))
      setRoles((currentRoles) =>
        currentRoles.map((role) =>
          role.id === selectedRoleId
            ? {
                ...role,
                moduleCount: new Set(savedSelection.moduleIds).size,
              }
            : role
        )
      )
      setStatusMessage(payload.message ?? 'Role module access updated successfully')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update role module access'
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (roles.length === 0) {
    return (
      <section className="space-y-5">
        <div className="bg-white rounded-lg shadow p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-gray-900">Role module access</h2>
          <p className="mt-1 text-sm text-gray-500">No roles have been created yet.</p>
        </div>
      </section>
    )
  }

  const hasModules = initialModules.length > 0

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-lg shadow p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_auto] lg:items-end">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Role module access</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select a role and update its visible modules.
            </p>
          </div>
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              htmlFor="role-module-role"
            >
              Role
            </label>
            <select
              id="role-module-role"
              value={selectedRoleId ?? ''}
              onChange={(event) => handleRoleChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              disabled={isLoading || isSaving}
            >
              {sortedRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            onClick={() => void handleSave()}
            disabled={!selectedRoleId || !hasModules || isLoading || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save access'}
          </button>
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Roles</h3>
          <ul className="mt-4 divide-y divide-gray-100">
            {sortedRoles.map((role) => {
              const isSelected = role.id === selectedRoleId
              const cachedMapping = persistedMappings[role.id]
              const moduleCount = cachedMapping
                ? new Set(cachedMapping.moduleIds).size
                : role.moduleCount

              return (
                <li key={role.id} className="py-2">
                  <button
                    type="button"
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      isSelected
                        ? 'bg-indigo-50 font-semibold text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => handleRoleChange(role.id)}
                    disabled={isLoading || isSaving}
                  >
                    <span className="block text-gray-900">{role.name}</span>
                    <span className="mt-1 block text-xs text-gray-500">
                      {moduleCount} modules
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Module hierarchy
            </h3>
            {selectedRole && (
              <span className="text-xs font-medium text-gray-500">
                {selectedRole.name}
              </span>
            )}
          </div>

          {!hasModules ? (
            <p className="mt-4 text-sm text-gray-500">No modules are available.</p>
          ) : (
            <fieldset className="mt-4 space-y-3" disabled={isLoading || isSaving}>
              <legend className="sr-only">
                Module access for {selectedRole?.name ?? 'selected role'}
              </legend>
              {isLoading && (
                <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Loading role module access...
                </p>
              )}
              {initialModules.map((module) => {
                const moduleCheckboxId = `role-module-${module.id}`
                const isModuleChecked = selection.moduleIds.includes(module.id)

                return (
                  <div key={module.id} className="rounded-md border border-gray-200 p-3">
                    <label
                      className="flex items-start gap-3 text-sm font-medium text-gray-900"
                      htmlFor={moduleCheckboxId}
                    >
                      <input
                        id={moduleCheckboxId}
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
                        checked={isModuleChecked}
                        onChange={() => toggleModule(module.id)}
                        aria-label={`${module.label} module access for ${
                          selectedRole?.name ?? 'selected role'
                        }`}
                      />
                      <span>
                        <span className="block">{module.label}</span>
                        {module.href && (
                          <span className="mt-1 block text-xs font-normal text-gray-500">
                            {module.href}
                          </span>
                        )}
                      </span>
                    </label>

                    {module.subModules.length > 0 ? (
                      <div className="mt-3 grid gap-2 pl-7 sm:grid-cols-2">
                        {module.subModules.map((subModule) => {
                          const subModuleCheckboxId = `role-sub-module-${subModule.id}`
                          const isSubModuleChecked = selection.subModuleIds.includes(subModule.id)

                          return (
                            <label
                              key={subModule.id}
                              className="flex items-start gap-2 rounded-md bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-700"
                              htmlFor={subModuleCheckboxId}
                            >
                              <input
                                id={subModuleCheckboxId}
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
                                checked={isSubModuleChecked}
                                onChange={() => toggleSubModule(module.id, subModule.id)}
                                aria-label={`${subModule.label} sub-module access for ${
                                  selectedRole?.name ?? 'selected role'
                                }`}
                              />
                              <span>
                                <span className="block">{subModule.label}</span>
                                <span className="mt-0.5 block font-normal text-gray-500">
                                  {subModule.href}
                                </span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 pl-7 text-sm text-gray-500">No sub-modules</p>
                    )}
                  </div>
                )
              })}
            </fieldset>
          )}
        </div>
      </div>
    </section>
  )
}
