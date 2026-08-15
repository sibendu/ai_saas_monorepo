import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { AdminUserGroupAssignmentRequest, AdminUserSummary, ApiResponse } from '@saas/shared-types'
import { getAdminAuthorization } from '@/lib/admin-auth'
import { adminUserSelect, mapAdminUser } from '@/lib/admin-users'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{
    userId: string
  }>
}

function parsePositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null
  }

  const parsedValue = Number(value)

  return Number.isSafeInteger(parsedValue) ? parsedValue : null
}

async function readGroupAssignmentRequest(
  request: Request
): Promise<Partial<AdminUserGroupAssignmentRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminUserGroupAssignmentRequest>
  } catch {
    return null
  }
}

function normalizeGroupIds(groupIds: unknown): number[] | null {
  if (!Array.isArray(groupIds)) {
    return null
  }

  const normalizedGroupIds: number[] = []
  const uniqueGroupIds = new Set<number>()

  for (const groupId of groupIds) {
    if (typeof groupId !== 'string') {
      return null
    }

    const normalizedGroupId = parsePositiveInteger(groupId)

    if (!normalizedGroupId || uniqueGroupIds.has(normalizedGroupId)) {
      return null
    }

    uniqueGroupIds.add(normalizedGroupId)
    normalizedGroupIds.push(normalizedGroupId)
  }

  return normalizedGroupIds
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
    const body = await readGroupAssignmentRequest(request)

    if (!body) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.groupIds)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'groupIds must be an array' },
        { status: 400 }
      )
    }

    const groupIds = normalizeGroupIds(body.groupIds)

    if (!groupIds) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Group ids must be unique positive integers' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.customer.findUnique({
      where: { id: parsedUserId },
      select: { id: true },
    })

    if (!targetUser) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (groupIds.length > 0) {
      const existingGroups = await prisma.userGroup.findMany({
        where: {
          id: {
            in: groupIds,
          },
        },
        select: {
          id: true,
        },
      })

      if (existingGroups.length !== groupIds.length) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: 'One or more groups were not found' },
          { status: 400 }
        )
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.userGroupMember.deleteMany({
        where: {
          customerId: parsedUserId,
        },
      })

      if (groupIds.length > 0) {
        await tx.userGroupMember.createMany({
          data: groupIds.map((groupId) => ({
            customerId: parsedUserId,
            groupId,
          })),
        })
      }
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
      message: 'User groups updated successfully',
    })
  } catch (error) {
    console.error('Admin user group assignment error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to update user groups' },
      { status: 500 }
    )
  }
}
