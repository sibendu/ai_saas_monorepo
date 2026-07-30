import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { AdminUserRoleAssignmentRequest, AdminUserSummary, ApiResponse } from '@saas/shared-types'
import { writeAdminAuditLog } from '@/lib/admin-audit'
import { getAdminAuthorization } from '@/lib/admin-auth'
import { adminUserSelect, mapAdminUser } from '@/lib/admin-users'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{
    userId: string
  }>
}

interface TargetUserRole {
  roleId: number
}

function parsePositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null
  }

  const parsedValue = Number(value)

  return Number.isSafeInteger(parsedValue) ? parsedValue : null
}

async function readRoleAssignmentRequest(
  request: Request
): Promise<Partial<AdminUserRoleAssignmentRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminUserRoleAssignmentRequest>
  } catch {
    return null
  }
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

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  const { userId } = await context.params
  const parsedUserId = parsePositiveInteger(userId)

  if (!parsedUserId) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Invalid user id' },
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

    if (!Array.isArray(body.roleIds)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'roleIds must be an array' },
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

    const targetUser = await prisma.customer.findUnique({
      where: { id: parsedUserId },
      select: {
        id: true,
        userRoles: {
          select: {
            roleId: true,
          },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (roleIds.length > 0) {
      const existingRoles = await prisma.role.findMany({
        where: {
          id: {
            in: roleIds,
          },
        },
        select: {
          id: true,
        },
      })

      if (existingRoles.length !== roleIds.length) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: 'One or more roles were not found' },
          { status: 400 }
        )
      }
    }

    const adminRole = await prisma.role.findFirst({
      where: {
        name: {
          equals: 'Admin',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    })

    if (adminRole) {
      const targetHasAdminRole = targetUser.userRoles.some(
        (userRole: TargetUserRole) => userRole.roleId === adminRole.id
      )
      const keepsAdminRole = roleIds.includes(adminRole.id)

      if (targetHasAdminRole && !keepsAdminRole) {
        const adminUserCount = await prisma.userRole.count({
          where: {
            roleId: adminRole.id,
          },
        })

        if (adminUserCount <= 1) {
          return NextResponse.json<ApiResponse<never>>(
            { success: false, error: 'At least one admin user is required' },
            { status: 409 }
          )
        }
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.userRole.deleteMany({
        where: {
          customerId: parsedUserId,
        },
      })

      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            customerId: parsedUserId,
            roleId,
          })),
        })
      }

      await writeAdminAuditLog(tx, {
        actor: authorization,
        action: 'USER_ROLES_UPDATED',
        entityType: 'USER_ROLE',
        entityId: parsedUserId.toString(),
        targetCustomerId: parsedUserId,
        metadata: { roleIds: roleIds.map((roleId) => roleId.toString()) },
      })
    })

    const updatedUser = await prisma.customer.findUnique({
      where: { id: parsedUserId },
      select: adminUserSelect,
    })

    if (!updatedUser) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<AdminUserSummary>>({
      success: true,
      data: mapAdminUser(updatedUser),
      message: 'User roles updated successfully',
    })
  } catch (error) {
    console.error('Admin user role assignment error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to update user roles' },
      { status: 500 }
    )
  }
}
