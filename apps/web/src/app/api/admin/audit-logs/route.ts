import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import type { AdminAuditLogsData, ApiResponse } from '@saas/shared-types'
import { adminAuditActions, adminAuditEntityTypes, mapAuditLog } from '@/lib/admin-audit'
import { getAdminAuthorization } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json<ApiResponse<never>>({ success: false, error }, { status })
}

function parsePositiveInteger(value: string | null, label: string): number | string | null {
  if (value === null) {
    return null
  }

  if (!/^[1-9]\d*$/.test(value)) {
    return `Invalid ${label}`
  }

  const parsedValue = Number(value)

  return Number.isSafeInteger(parsedValue) ? parsedValue : `Invalid ${label}`
}

function parseDate(value: string | null, label: string): Date | string | null {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)

  return Number.isNaN(parsedDate.getTime()) ? `Invalid ${label}` : parsedDate
}

function parseLimit(value: string | null): number | string {
  if (value === null) {
    return 50
  }

  if (!/^[1-9]\d*$/.test(value)) {
    return 'limit must be between 1 and 100'
  }

  const parsedLimit = Number(value)

  return parsedLimit >= 1 && parsedLimit <= 100 ? parsedLimit : 'limit must be between 1 and 100'
}

export async function GET(request: Request): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return jsonError(authorization.error, authorization.status)
  }

  try {
    const searchParams = new URL(request.url).searchParams
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const actorEmail = searchParams.get('actorEmail')?.trim().toLowerCase() ?? null
    const targetCustomerId = parsePositiveInteger(
      searchParams.get('targetCustomerId'),
      'target customer id'
    )
    const targetRoleId = parsePositiveInteger(searchParams.get('targetRoleId'), 'target role id')
    const cursor = parsePositiveInteger(searchParams.get('cursor'), 'cursor')
    const limit = parseLimit(searchParams.get('limit'))
    const from = parseDate(searchParams.get('from'), 'date range')
    const to = parseDate(searchParams.get('to'), 'date range')

    if (action && !adminAuditActions.includes(action as never)) {
      return jsonError('Invalid action filter', 400)
    }

    if (entityType && !adminAuditEntityTypes.includes(entityType as never)) {
      return jsonError('Invalid entity type filter', 400)
    }

    if (actorEmail !== null && (!actorEmail || actorEmail.length > 320 || !actorEmail.includes('@'))) {
      return jsonError('Invalid actor email filter', 400)
    }

    for (const parsedValue of [targetCustomerId, targetRoleId, cursor, from, to]) {
      if (typeof parsedValue === 'string') {
        return jsonError(parsedValue, 400)
      }
    }

    if (typeof limit === 'string') {
      return jsonError(limit, 400)
    }

    const pageLimit = limit

    if (from && to && from > to) {
      return jsonError('Invalid date range', 400)
    }

    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action: action as Prisma.EnumAdminAuditActionFilter['equals'] } : {}),
      ...(entityType
        ? { entityType: entityType as Prisma.EnumAdminAuditEntityTypeFilter['equals'] }
        : {}),
      ...(actorEmail ? { actorEmail } : {}),
      ...(typeof targetCustomerId === 'number' ? { targetCustomerId } : {}),
      ...(typeof targetRoleId === 'number' ? { targetRoleId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(typeof cursor === 'number' ? { id: { lt: cursor } } : {}),
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageLimit + 1,
      }),
      prisma.auditLog.count({ where }),
    ])

    const pageLogs = logs.slice(0, pageLimit)
    const nextCursor =
      logs.length > pageLimit ? pageLogs[pageLogs.length - 1]?.id.toString() ?? null : null

    return NextResponse.json<ApiResponse<AdminAuditLogsData>>({
      success: true,
      data: {
        logs: pageLogs.map(mapAuditLog),
        nextCursor,
        totalCount,
      },
    })
  } catch (error) {
    console.error('Admin audit logs fetch error:', error)
    return jsonError('Failed to fetch audit logs', 500)
  }
}
