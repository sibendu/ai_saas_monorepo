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
  icon: string
  href: string
}

const emptyForm: ModuleFormState = {
  label: '',
  icon: '',
  href: '',
}

function toFormState(module: AdminModuleSummary): ModuleFormState {
  return {
    label: module.label,
    icon: module.icon ?? '',
    href: module.href ?? '',
  }
}

export default function ModuleManagement({ initialModules, onModulesChange }: ModuleManagementProps) {
  const [modules, setModules] = useState<AdminModuleSummary[]>(initialModules)
  const [formState, setFormState] = useState<ModuleFormState>(emptyForm)
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<ModuleFormState>(emptyForm)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const sortedModules = useMemo(
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
      icon: state.icon,
      href: state.href,
    }
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

      setModules((currentModules) => {
        const nextModules = [...currentModules, payload.data as AdminModuleSummary]
        onModulesChange?.(nextModules)

        return nextModules
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
            className="grid gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,8rem)_minmax(0,12rem)_auto]"
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
                Icon
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Href
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Sub-modules
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedModules.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                  No modules have been created yet.
                </td>
              </tr>
            ) : (
              sortedModules.map((module) => {
                const isEditing = editingModuleId === module.id

                return (
                  <tr key={module.id} className="align-top">
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
                        module.label
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
                      {module.subModules.length}
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
