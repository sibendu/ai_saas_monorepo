import { NextResponse } from 'next/server'
import {
  ApiResponse,
  AdminUserGroupMutationRequest,
  AdminUserGroupSummary,
} from '@saas/shared-types'
import {
  getPrismaErrorCode,
  mapAdminUserGroup,
  normalizeUserGroupDescription,
  normalizeUserGroupName,
  parseUserGroupId,
} from '@/lib/admin-user-groups'
import { getAdminAuthorization } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{
    groupId: string
  }>
}

async function readUserGroupMutationRequest(
  request: Request
): Promise<Partial<AdminUserGroupMutationRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminUserGroupMutationRequest>
  } catch {
    return null
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
    const body = await readUserGroupMutationRequest(request)

    if (!body) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const name = normalizeUserGroupName(body.name)

    if (!name) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User group name is required' },
        { status: 400 }
      )
    }

    const existingGroup = await prisma.userGroup.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        NOT: {
          id: parsedGroupId,
        },
      },
    })

    if (existingGroup) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A user group with this name already exists' },
        { status: 409 }
      )
    }

    const userGroup = await prisma.userGroup.update({
      where: { id: parsedGroupId },
      data: {
        name,
        description: normalizeUserGroupDescription(body.description),
      },
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

    return NextResponse.json<ApiResponse<AdminUserGroupSummary>>({
      success: true,
      data: mapAdminUserGroup(userGroup),
      message: 'User group updated successfully',
    })
  } catch (error) {
    const prismaErrorCode = getPrismaErrorCode(error)

    if (prismaErrorCode === 'P2025') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User group not found' },
        { status: 404 }
      )
    }

    if (prismaErrorCode === 'P2002') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A user group with this name already exists' },
        { status: 409 }
      )
    }

    console.error('Admin user group update error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to update user group' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
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
    const deletedGroup = await prisma.userGroup.delete({
      where: { id: parsedGroupId },
    })

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id: deletedGroup.id.toString() },
      message: 'User group deleted successfully',
    })
  } catch (error) {
    if (getPrismaErrorCode(error) === 'P2025') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User group not found' },
        { status: 404 }
      )
    }

    console.error('Admin user group delete error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to delete user group' },
      { status: 500 }
    )
  }
}
