'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  AdminAuditAction,
  AdminAuditEntityType,
  AdminAuditLogSummary,
  AdminAuditLogsData,
} from '@saas/shared-types'
import { readApiResponse } from '@/lib/client-api'

const actionOptions: Array<{ value: AdminAuditAction; label: string }> = [
  { value: 'ROLE_CREATED', label: 'Role created' },
  { value: 'ROLE_UPDATED', label: 'Role updated' },
  { value: 'ROLE_DELETED', label: 'Role deleted' },
  { value: 'USER_UPDATED', label: 'User updated' },
  { value: 'USER_ROLES_UPDATED', label: 'User roles updated' },
  { value: 'ROLE_MODULES_UPDATED', label: 'Role modules updated' },
]

const entityTypeOptions: Array<{ value: AdminAuditEntityType; label: string }> = [
  { value: 'ROLE', label: 'Role' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'USER_ROLE', label: 'User role' },
  { value: 'ROLE_MODULE', label: 'Role module' },
]

interface AuditFilters {
  action: string
  entityType: string
  actorEmail: string
  targetCustomerId: string
  targetRoleId: string
  from: string
  to: string
}

const emptyFilters: AuditFilters = {
  action: '',
  entityType: '',
  actorEmail: '',
  targetCustomerId: '',
  targetRoleId: '',
  from: '',
  to: '',
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function actionLabel(action: AdminAuditAction): string {
  return actionOptions.find((option) => option.value === action)?.label ?? action
}

function summarizeMetadata(log: AdminAuditLogSummary): string {
  const metadata = log.metadata ?? {}
  const parts: string[] = []

  if (typeof metadata.roleName === 'string') {
    parts.push(`Role: ${metadata.roleName}`)
  }

  if (Array.isArray(metadata.changedFields)) {
    parts.push(`Changed: ${metadata.changedFields.join(', ')}`)
  }

  if (Array.isArray(metadata.roleIds)) {
    parts.push(`Role ids: ${metadata.roleIds.join(', ') || 'none'}`)
  }

  if (Array.isArray(metadata.moduleIds)) {
    parts.push(`Module ids: ${metadata.moduleIds.join(', ') || 'none'}`)
  }

  if (Array.isArray(metadata.subModuleIds)) {
    parts.push(`Sub-module ids: ${metadata.subModuleIds.join(', ') || 'none'}`)
  }

  return parts.join(' | ') || 'No metadata'
}

function toApiDate(value: string): string {
  return value ? new Date(value).toISOString() : ''
}

export default function AuditLogViewer() {
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(emptyFilters)
  const [logs, setLogs] = useState<AdminAuditLogSummary[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const searchParams = new URLSearchParams()

    for (const [key, value] of Object.entries(appliedFilters)) {
      if (!value) {
        continue
      }

      searchParams.set(key, key === 'from' || key === 'to' ? toApiDate(value) : value)
    }

    return searchParams.toString()
  }, [appliedFilters])

  async function loadLogs(cursor?: string) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const searchParams = new URLSearchParams(queryString)
      searchParams.set('limit', '25')

      if (cursor) {
        searchParams.set('cursor', cursor)
      }

      const response = await fetch(`/api/admin/audit-logs?${searchParams.toString()}`, {
        cache: 'no-store',
      })
      const payload = await readApiResponse<AdminAuditLogsData>(
        response,
        'Failed to fetch audit logs'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to fetch audit logs')
      }

      const data = payload.data

      setLogs((currentLogs) => (cursor ? [...currentLogs, ...data.logs] : data.logs))
      setNextCursor(data.nextCursor ?? null)
      setTotalCount(data.totalCount)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch audit logs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [queryString])

  function updateFilter(key: keyof AuditFilters, value: string) {
    setDraftFilters((currentFilters) => ({ ...currentFilters, [key]: value }))
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium text-gray-700">
            Action
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={draftFilters.action}
              onChange={(event) => updateFilter('action', event.target.value)}
            >
              <option value="">All actions</option>
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Entity
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={draftFilters.entityType}
              onChange={(event) => updateFilter('entityType', event.target.value)}
            >
              <option value="">All entities</option>
              {entityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Actor email
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={draftFilters.actorEmail}
              onChange={(event) => updateFilter('actorEmail', event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Target customer id
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              inputMode="numeric"
              value={draftFilters.targetCustomerId}
              onChange={(event) => updateFilter('targetCustomerId', event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Target role id
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              inputMode="numeric"
              value={draftFilters.targetRoleId}
              onChange={(event) => updateFilter('targetRoleId', event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            From
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              type="datetime-local"
              value={draftFilters.from}
              onChange={(event) => updateFilter('from', event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            To
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              type="datetime-local"
              value={draftFilters.to}
              onChange={(event) => updateFilter('to', event.target.value)}
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              onClick={() => setAppliedFilters(draftFilters)}
            >
              Apply
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setDraftFilters(emptyFilters)
                setAppliedFilters(emptyFilters)
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Audit logs</h2>
          <p className="mt-1 text-sm text-gray-500">{totalCount} matching records</p>
        </div>

        {errorMessage && (
          <p className="m-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {isLoading && logs.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Loading audit logs...</p>
        ) : logs.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No audit logs match the current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.actorEmail}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {actionLabel(log.action)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.entityLabel ?? log.entityId ?? log.entityType}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{summarizeMetadata(log)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nextCursor && (
          <div className="border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              onClick={() => void loadLogs(nextCursor)}
            >
              {isLoading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
