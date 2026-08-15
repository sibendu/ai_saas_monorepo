'use client'

import { FormEvent, useMemo, useState } from 'react'
import {
  AdminModuleMutationRequest,
  AdminModuleSummary,
  AdminModulesData,
} from '@saas/shared-types'
import { readApiResponse } from '@/lib/client-api'

interface ModuleManagementProps {
  initialModules: AdminModuleSummary[]
  onModulesChange?: (modules: AdminModuleSummary[]) => void
}

interface ModuleFormState {
  label: string
  parentModuleId: string
  displayOrder: string
  icon: string
  href: string
}

interface HierarchicalModuleRow {
  module: AdminModuleSummary
  depth: number
}

const emptyForm: ModuleFormState = {
  label: '',
  parentModuleId: '',
  displayOrder: '',
  icon: '',
  href: '',
}

function toFormState(module: AdminModuleSummary): ModuleFormState {
  return {
    label: module.label,
    parentModuleId: module.parentModuleId ?? '',
    displayOrder: module.displayOrder.toString(),
    icon: module.icon ?? '',
    href: module.href ?? '',
  }
}

function compareModules(first: AdminModuleSummary, second: AdminModuleSummary): number {
  if (first.displayOrder !== second.displayOrder) {
    return first.displayOrder - second.displayOrder
  }

  return first.label.localeCompare(second.label)
}

function sortModulesForHierarchy(
  modules: AdminModuleSummary[],
  collapsedModuleIds: Set<string>
): HierarchicalModuleRow[] {
  const modulesByParent = new Map<string, AdminModuleSummary[]>()
  const sortedModules: HierarchicalModuleRow[] = []
  const visitedModuleIds = new Set<string>()
  const moduleIds = new Set(modules.map((module) => module.id))

  for (const module of modules) {
    const parentKey = module.parentModuleId ?? ''
    const siblings = modulesByParent.get(parentKey) ?? []
    siblings.push(module)
    modulesByParent.set(parentKey, siblings)
  }

  for (const siblings of modulesByParent.values()) {
    siblings.sort(compareModules)
  }

  function visit(parentId: string, depth: number) {
    for (const module of modulesByParent.get(parentId) ?? []) {
      sortedModules.push({ module, depth })
      visitedModuleIds.add(module.id)
      if (!collapsedModuleIds.has(module.id)) {
        visit(module.id, depth + 1)
      }
    }
  }

  visit('', 0)

  for (const module of [...modules].sort(compareModules)) {
    const isOrphaned = module.parentModuleId ? !moduleIds.has(module.parentModuleId) : false

    if (!visitedModuleIds.has(module.id) && isOrphaned) {
      sortedModules.push({ module, depth: 0 })
    }
  }

  return sortedModules
}

export default function ModuleManagement({ initialModules, onModulesChange }: ModuleManagementProps) {
  const [modules, setModules] = useState<AdminModuleSummary[]>(initialModules)
  const [formState, setFormState] = useState<ModuleFormState>(emptyForm)
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<ModuleFormState>(emptyForm)
  const [collapsedModuleIds, setCollapsedModuleIds] = useState<Set<string>>(
    () =>
      new Set(
        initialModules
          .filter((module) => module.childModuleCount > 0)
          .map((module) => module.id)
      )
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const sortedModules = useMemo(
    () => sortModulesForHierarchy(modules, collapsedModuleIds),
    [collapsedModuleIds, modules]
  )

  const parentModuleOptions = useMemo(
    () => [...modules].sort((first, second) => first.label.localeCompare(second.label)),
    [modules]
  )

  async function refreshModules() {
    const response = await fetch('/api/admin/modules', { cache: 'no-store' })
    const payload = await readApiResponse<AdminModulesData>(response, 'Failed to refresh modules')

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? 'Failed to refresh modules')
    }

    setModules(payload.data.modules)
    onModulesChange?.(payload.data.modules)
  }

  function toRequestBody(state: ModuleFormState): AdminModuleMutationRequest {
    return {
      label: state.label,
      parentModuleId: state.parentModuleId || null,
      displayOrder: state.displayOrder ? Number(state.displayOrder) : null,
      icon: state.icon,
      href: state.href,
    }
  }

  function getParentOptions(moduleId?: string) {
    return parentModuleOptions.filter((module) => module.id !== moduleId)
  }

  function toggleCollapsed(moduleId: string) {
    setCollapsedModuleIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(moduleId)) {
        nextIds.delete(moduleId)
      } else {
        nextIds.add(moduleId)
      }

      return nextIds
    })
  }

  async function handleCreateModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toRequestBody(formState)),
      })
      const payload = await readApiResponse<AdminModuleSummary>(
        response,
        'Failed to create module'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to create module')
      }

      const createdModule = payload.data

      setModules((currentModules) => {
        const nextModules = [...currentModules, createdModule]
        onModulesChange?.(nextModules)

        return nextModules
      })
      setCollapsedModuleIds((currentIds) => {
        const nextIds = new Set(currentIds)

        if (createdModule.parentModuleId) {
          nextIds.delete(createdModule.parentModuleId)
        }

        return nextIds
      })
      setFormState(emptyForm)
      setStatusMessage(payload.message ?? 'Module created successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create module')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateModule(moduleId: string) {
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toRequestBody(editingState)),
      })
      const payload = await readApiResponse<AdminModuleSummary>(
        response,
        'Failed to update module'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to update module')
      }

      setModules((currentModules) => {
        const nextModules = currentModules.map((module) =>
          module.id === moduleId ? (payload.data as AdminModuleSummary) : module
        )
        onModulesChange?.(nextModules)

        return nextModules
      })
      setEditingModuleId(null)
      setEditingState(emptyForm)
      setStatusMessage(payload.message ?? 'Module updated successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update module')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteModule(module: AdminModuleSummary) {
    const shouldDelete = window.confirm(`Delete module "${module.label}"?`)

    if (!shouldDelete) {
      return
    }

    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/modules/${module.id}`, {
        method: 'DELETE',
      })
      const payload = await readApiResponse<{ id: string }>(response, 'Failed to delete module')

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to delete module')
      }

      setModules((currentModules) => {
        const nextModules = currentModules.filter((currentModule) => currentModule.id !== module.id)
        onModulesChange?.(nextModules)

        return nextModules
      })
      setStatusMessage(payload.message ?? 'Module deleted successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete module')
      await refreshModules().catch(() => undefined)
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(module: AdminModuleSummary) {
    setEditingModuleId(module.id)
    setEditingState(toFormState(module))
    setStatusMessage(null)
    setErrorMessage(null)
  }

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-lg shadow p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Modules</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create and maintain modules used by role access mapping.
            </p>
          </div>
          <form
            className="grid gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,12rem)_minmax(0,7rem)_minmax(0,8rem)_minmax(0,12rem)_auto]"
            onSubmit={handleCreateModule}
          >
            <label className="sr-only" htmlFor="module-label">
              Module label
            </label>
            <input
              id="module-label"
              value={formState.label}
              onChange={(event) =>
                setFormState((state) => ({ ...state, label: event.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Label"
              disabled={isSaving}
            />
            <label className="sr-only" htmlFor="module-parent">
              Parent module
            </label>
            <select
              id="module-parent"
              value={formState.parentModuleId}
              onChange={(event) =>
                setFormState((state) => ({ ...state, parentModuleId: event.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              disabled={isSaving}
            >
              <option value="">Top level</option>
              {getParentOptions().map((module) => (
                <option key={module.id} value={module.id}>
                  {module.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="module-order">
              Order
            </label>
            <input
              id="module-order"
              type="number"
              min="1"
              step="1"
              value={formState.displayOrder}
              onChange={(event) =>
                setFormState((state) => ({ ...state, displayOrder: event.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Order"
              disabled={isSaving}
            />
            <label className="sr-only" htmlFor="module-icon">
              Icon
            </label>
            <input
              id="module-icon"
              value={formState.icon}
              onChange={(event) =>
                setFormState((state) => ({ ...state, icon: event.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Icon"
              disabled={isSaving}
            />
            <label className="sr-only" htmlFor="module-href">
              Href
            </label>
            <input
              id="module-href"
              value={formState.href}
              onChange={(event) =>
                setFormState((state) => ({ ...state, href: event.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="/path"
              disabled={isSaving}
            />
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              disabled={isSaving}
            >
              Add module
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
                Module
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Parent
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Icon
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Href
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Children
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedModules.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={7}>
                  No modules have been created yet.
                </td>
              </tr>
            ) : (
              sortedModules.map(({ module, depth }) => {
                const isEditing = editingModuleId === module.id
                const hasChildren = module.childModuleCount > 0
                const isCollapsed = collapsedModuleIds.has(module.id)

                return (
                  <tr
                    key={module.id}
                    className={`align-top ${depth > 0 ? 'bg-slate-50/70' : 'bg-white'}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {isEditing ? (
                        <input
                          value={editingState.label}
                          onChange={(event) =>
                            setEditingState((state) => ({
                              ...state,
                              label: event.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          disabled={isSaving}
                        />
                      ) : (
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${Math.min(depth, 6) * 1.25}rem` }}
                        >
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleCollapsed(module.id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                              aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${module.label}`}
                            >
                              <span
                                className={`text-xs transition-transform ${
                                  isCollapsed ? '-rotate-90' : 'rotate-0'
                                }`}
                                aria-hidden="true"
                              >
                                ▼
                              </span>
                            </button>
                          ) : (
                            <span className="h-6 w-6" aria-hidden="true" />
                          )}
                          {depth > 0 && (
                            <span className="h-5 border-l border-b border-gray-300 pl-3 text-gray-400" aria-hidden="true" />
                          )}
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                              depth === 0
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {depth === 0 ? 'Top' : `L${depth + 1}`}
                          </span>
                          <span>{module.label}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {isEditing ? (
                        <select
                          value={editingState.parentModuleId}
                          onChange={(event) =>
                            setEditingState((state) => ({
                              ...state,
                              parentModuleId: event.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          disabled={isSaving}
                        >
                          <option value="">Top level</option>
                          {getParentOptions(module.id).map((parentModule) => (
                            <option key={parentModule.id} value={parentModule.id}>
                              {parentModule.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        module.parentModuleLabel ?? 'Top level'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={editingState.displayOrder}
                          onChange={(event) =>
                            setEditingState((state) => ({
                              ...state,
                              displayOrder: event.target.value,
                            }))
                          }
                          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
                          disabled={isSaving}
                        />
                      ) : (
                        module.displayOrder
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {isEditing ? (
                        <input
                          value={editingState.icon}
                          onChange={(event) =>
                            setEditingState((state) => ({ ...state, icon: event.target.value }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          disabled={isSaving}
                        />
                      ) : (
                        module.icon ?? 'No icon'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {isEditing ? (
                        <input
                          value={editingState.href}
                          onChange={(event) =>
                            setEditingState((state) => ({ ...state, href: event.target.value }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          disabled={isSaving}
                        />
                      ) : (
                        module.href ?? 'No href'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {module.childModuleCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleUpdateModule(module.id)}
                              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                              disabled={isSaving}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingModuleId(null)
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
                              onClick={() => startEditing(module)}
                              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                              disabled={isSaving}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteModule(module)}
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
