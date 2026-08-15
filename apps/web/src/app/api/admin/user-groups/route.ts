import { NextResponse } from 'next/server'
import {
  ApiResponse,
  AdminUserGroupMutationRequest,
  AdminUserGroupsData,
  AdminUserGroupSummary,
} from '@saas/shared-types'
import {
  getPrismaErrorCode,
  mapAdminUserGroup,
  normalizeUserGroupDescription,
  normalizeUserGroupName,
} from '@/lib/admin-user-groups'
import { getAdminAuthorization } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

async function readUserGroupMutationRequest(
  request: Request
): Promise<Partial<AdminUserGroupMutationRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminUserGroupMutationRequest>
  } catch {
    return null
  }
}

export async function GET(): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  try {
    const userGroups = await prisma.userGroup.findMany({
      orderBy: { name: 'asc' },
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

    return NextResponse.json<ApiResponse<AdminUserGroupsData>>({
      success: true,
      data: {
        userGroups: userGroups.map(mapAdminUserGroup),
      },
    })
  } catch (error) {
    console.error('Admin user groups fetch error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to fetch user groups' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
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
      },
    })

    if (existingGroup) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A user group with this name already exists' },
        { status: 409 }
      )
    }

    const userGroup = await prisma.userGroup.create({
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
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    })

    return NextResponse.json<ApiResponse<AdminUserGroupSummary>>(
      {
        success: true,
        data: mapAdminUserGroup(userGroup),
        message: 'User group created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    if (getPrismaErrorCode(error) === 'P2002') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A user group with this name already exists' },
        { status: 409 }
      )
    }

    console.error('Admin user group create error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to create user group' },
      { status: 500 }
    )
  }
}
