import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import {
  AdminUserGroupRoleAssignmentRequest,
  AdminUserGroupRolesData,
  ApiResponse,
} from '@saas/shared-types'
import { writeAdminAuditLog } from '@/lib/admin-audit'
import { getAdminAuthorization } from '@/lib/admin-auth'
import { mapAdminUserGroup, parseUserGroupId } from '@/lib/admin-user-groups'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{
    groupId: string
  }>
}

function parsePositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null
  }

  const parsedValue = Number(value)

  return Number.isSafeInteger(parsedValue) ? parsedValue : null
}

function normalizeRoleIds(roleIds: unknown): number[] | null {
  if (!Array.isArray(roleIds)) {
    return null
  }

  const normalizedRoleIds: number[] = []
  const uniqueRoleIds = new Set<number>()

  for (const roleId of roleIds) {
    if (typeof roleId !== 'string') {
      return null
    }

    const normalizedRoleId = parsePositiveInteger(roleId)

    if (!normalizedRoleId || uniqueRoleIds.has(normalizedRoleId)) {
      return null
    }

    uniqueRoleIds.add(normalizedRoleId)
    normalizedRoleIds.push(normalizedRoleId)
  }

  return normalizedRoleIds
}

async function readRoleAssignmentRequest(
  request: Request
): Promise<Partial<AdminUserGroupRoleAssignmentRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminUserGroupRoleAssignmentRequest>
  } catch {
    return null
  }
}

async function buildGroupRolesData(groupId: number): Promise<AdminUserGroupRolesData | null> {
  const group = await prisma.userGroup.findUnique({
    where: { id: groupId },
    include: {
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: {
          role: {
            name: 'asc',
          },
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  })

  if (!group) {
    return null
  }

  const mappedGroup = mapAdminUserGroup(group)

  return {
    group: mappedGroup,
    roles: mappedGroup.roles,
  }
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  const { groupId } = await context.params
  const parsedGroupId = parseUserGroupId(groupId)

  if (!parsedGroupId) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Invalid user group id' },
      { status: 400 }
    )
  }

  try {
    const data = await buildGroupRolesData(parsedGroupId)

    if (!data) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<AdminUserGroupRolesData>>({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Admin user group roles fetch error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to fetch group roles' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  const { groupId } = await context.params
  const parsedGroupId = parseUserGroupId(groupId)

  if (!parsedGroupId) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Invalid user group id' },
      { status: 400 }
    )
  }

  try {
    const body = await readRoleAssignmentRequest(request)

    if (!body) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const roleIds = normalizeRoleIds(body.roleIds)

    if (!roleIds) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Role ids must be unique positive integers' },
        { status: 400 }
      )
    }

    const [group, existingRoles] = await Promise.all([
      prisma.userGroup.findUnique({ where: { id: parsedGroupId }, select: { id: true } }),
      roleIds.length > 0
        ? prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true } })
        : Promise.resolve([]),
    ])

    if (!group) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User group not found' },
        { status: 404 }
      )
    }

    if (existingRoles.length !== roleIds.length) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'One or more roles were not found' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.groupRole.deleteMany({
        where: {
          groupId: parsedGroupId,
        },
      })

      if (roleIds.length > 0) {
        await tx.groupRole.createMany({
          data: roleIds.map((roleId) => ({
            groupId: parsedGroupId,
            roleId,
          })),
        })
      }

      await writeAdminAuditLog(tx, {
        actor: authorization,
        action: 'GROUP_ROLES_UPDATED',
        entityType: 'GROUP_ROLE',
        entityId: parsedGroupId.toString(),
        metadata: { roleIds: roleIds.map((roleId) => roleId.toString()) },
      })
    })

    const data = await buildGroupRolesData(parsedGroupId)

    return NextResponse.json<ApiResponse<AdminUserGroupRolesData>>({
      success: true,
      data: data as AdminUserGroupRolesData,
      message: 'Group roles updated successfully',
    })
  } catch (error) {
    console.error('Admin user group role assignment error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to update group roles' },
      { status: 500 }
    )
  }
}
