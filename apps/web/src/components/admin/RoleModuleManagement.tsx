'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdminModuleSummary,
  AdminRoleModuleMappingData,
  AdminRoleModuleMappingRequest,
  AdminRoleSummary,
  AdminSubModuleSummary,
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

function getModuleChildIds(module: AdminModuleSummary): string[] {
  return module.childModules.map((childModule) => childModule.id)
}

function getVisibleLegacySubModules(module: AdminModuleSummary): AdminSubModuleSummary[] {
  return module.childModules.length > 0 ? [] : module.subModules
}

function getVisibleLegacySubModuleIds(module: AdminModuleSummary): string[] {
  return getVisibleLegacySubModules(module).map((subModule) => subModule.id)
}

function normalizeSelectionForModules(
  selection: MappingSelection,
  modules: AdminModuleSummary[]
): MappingSelection {
  const moduleIds = new Set(selection.moduleIds)
  const subModuleIds = new Set<string>()
  const selectedSubModuleIds = new Set(selection.subModuleIds)

  for (const module of modules) {
    if (module.parentModuleId) {
      continue
    }

    for (const childModule of module.childModules) {
      if (moduleIds.has(childModule.id)) {
        moduleIds.add(module.id)
      }
    }

    if (module.childModules.length > 0) {
      for (const legacySubModule of module.subModules) {
        if (!selectedSubModuleIds.has(legacySubModule.id)) {
          continue
        }

        const matchingChildModule = module.childModules.find(
          (childModule) =>
            childModule.href === legacySubModule.href ||
            childModule.label === legacySubModule.label
        )

        if (matchingChildModule) {
          moduleIds.add(module.id)
          moduleIds.add(matchingChildModule.id)
        }
      }

      continue
    }

    for (const subModule of module.subModules) {
      if (selectedSubModuleIds.has(subModule.id)) {
        moduleIds.add(module.id)
        subModuleIds.add(subModule.id)
      }
    }
  }

  return normalizeSelection({
    moduleIds: [...moduleIds],
    subModuleIds: [...subModuleIds],
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
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([])
  const [roleFilter, setRoleFilter] = useState('')

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  )

  const sortedRoles = useMemo(
    () => [...roles].sort((first, second) => first.name.localeCompare(second.name)),
    [roles]
  )

  const filteredRoles = useMemo(() => {
    const normalizedFilter = roleFilter.trim().toLowerCase()

    if (!normalizedFilter) {
      return sortedRoles
    }

    return sortedRoles.filter((role) =>
      [role.name, role.description ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedFilter)
      )
    )
  }, [roleFilter, sortedRoles])

  const topLevelModules = useMemo(
    () => initialModules.filter((module) => !module.parentModuleId),
    [initialModules]
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

        const loadedSelection = normalizeSelectionForModules(toSelection(payload.data), initialModules)

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
      const parentModule = topLevelModules.find((module) => module.id === moduleId)
      const childModuleIds = parentModule ? getModuleChildIds(parentModule) : []
      const legacySubModuleIds = parentModule ? getVisibleLegacySubModuleIds(parentModule) : []
      const isSelected = currentSelection.moduleIds.includes(moduleId)
      const nextSelection = isSelected
        ? {
            moduleIds: currentSelection.moduleIds.filter(
              (selectedModuleId) =>
                selectedModuleId !== moduleId && !childModuleIds.includes(selectedModuleId)
            ),
            subModuleIds: currentSelection.subModuleIds.filter(
              (selectedSubModuleId) => !legacySubModuleIds.includes(selectedSubModuleId)
            ),
          }
        : {
            moduleIds: [...currentSelection.moduleIds, moduleId, ...childModuleIds],
            subModuleIds: [...currentSelection.subModuleIds, ...legacySubModuleIds],
          }

      return normalizeSelection(nextSelection)
    })
    setStatusMessage(null)
    setErrorMessage(null)
  }

  function toggleChildModule(parentModuleId: string, childModuleId: string) {
    setSelection((currentSelection) => {
      const isSelected = currentSelection.moduleIds.includes(childModuleId)
      const nextSelection = isSelected
        ? {
            ...currentSelection,
            moduleIds: currentSelection.moduleIds.filter(
              (selectedModuleId) => selectedModuleId !== childModuleId
            ),
          }
        : {
            ...currentSelection,
            moduleIds: currentSelection.moduleIds.includes(parentModuleId)
              ? [...currentSelection.moduleIds, childModuleId]
              : [...currentSelection.moduleIds, parentModuleId, childModuleId],
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

  function toggleModuleExpanded(moduleId: string) {
    setExpandedModuleIds((currentExpandedModuleIds) =>
      currentExpandedModuleIds.includes(moduleId)
        ? currentExpandedModuleIds.filter((expandedModuleId) => expandedModuleId !== moduleId)
        : [...currentExpandedModuleIds, moduleId]
    )
  }

  async function handleSave() {
    if (!selectedRoleId || !selectedRole) {
      return
    }

    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const requestBody: AdminRoleModuleMappingRequest = normalizeSelectionForModules(
        selection,
        initialModules
      )
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
          <h2 className="text-lg font-semibold text-gray-900">Role-Module</h2>
          <p className="mt-1 text-sm text-gray-500">No roles have been created yet.</p>
        </div>
      </section>
    )
  }

  const hasModules = topLevelModules.length > 0

  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label
                className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
                htmlFor="role-module-filter"
              >
                Roles
              </label>
              <input
                id="role-module-filter"
                type="search"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                placeholder="Filter roles"
              />
            </div>
            <button
              type="button"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              onClick={() => void handleSave()}
              disabled={!selectedRoleId || !hasModules || isLoading || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {statusMessage && (
            <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              {statusMessage}
            </p>
          )}
          {errorMessage && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
          <ul className="mt-4 divide-y divide-gray-100">
            {filteredRoles.map((role) => {
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
          {filteredRoles.length === 0 && (
            <p className="mt-4 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
              No roles match this filter.
            </p>
          )}
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
              {topLevelModules.map((module) => {
                const moduleCheckboxId = `role-module-${module.id}`
                const isModuleChecked = selection.moduleIds.includes(module.id)
                const visibleLegacySubModules = getVisibleLegacySubModules(module)
                const hasSubModules =
                  module.childModules.length > 0 || visibleLegacySubModules.length > 0
                const isExpanded = expandedModuleIds.includes(module.id)

                return (
                  <div key={module.id} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-start gap-3">
                      <label
                        className="flex min-w-0 flex-1 items-start gap-3 text-sm font-medium text-gray-900"
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
                        <span className="min-w-0">
                          <span className="block">{module.label}</span>
                          {module.href && (
                            <span className="mt-1 block truncate text-xs font-normal text-gray-500">
                              {module.href}
                            </span>
                          )}
                        </span>
                      </label>
                      {hasSubModules && (
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          onClick={() => toggleModuleExpanded(module.id)}
                          aria-expanded={isExpanded}
                          aria-controls={`role-module-children-${module.id}`}
                          aria-label={`${isExpanded ? 'Hide' : 'Show'} sub-modules for ${
                            module.label
                          }`}
                        >
                          <span
                            className={`text-base leading-none transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                            aria-hidden="true"
                          >
                            &gt;
                          </span>
                        </button>
                      )}
                    </div>

                    {hasSubModules && isExpanded && (
                      <div
                        id={`role-module-children-${module.id}`}
                        className="mt-3 grid gap-2 pl-7 sm:grid-cols-2"
                      >
                        {module.childModules.map((childModule) => {
                          const childModuleCheckboxId = `role-child-module-${childModule.id}`
                          const isChildModuleChecked = selection.moduleIds.includes(childModule.id)

                          return (
                            <label
                              key={childModule.id}
                              className="flex items-start gap-2 rounded-md bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-700"
                              htmlFor={childModuleCheckboxId}
                            >
                              <input
                                id={childModuleCheckboxId}
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
                                checked={isChildModuleChecked}
                                onChange={() => toggleChildModule(module.id, childModule.id)}
                                aria-label={`${childModule.label} sub-module access for ${
                                  selectedRole?.name ?? 'selected role'
                                }`}
                              />
                              <span>
                                <span className="block">{childModule.label}</span>
                                {childModule.href && (
                                  <span className="mt-0.5 block font-normal text-gray-500">
                                    {childModule.href}
                                  </span>
                                )}
                              </span>
                            </label>
                          )
                        })}
                        {visibleLegacySubModules.map((subModule) => {
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
                    )}
                    {!hasSubModules && (
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
