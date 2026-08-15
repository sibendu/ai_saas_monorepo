import { NextResponse } from 'next/server'
import {
  AdminUserGroupUserAssignmentRequest,
  AdminUserGroupUsersData,
  ApiResponse,
} from '@saas/shared-types'
import { getAdminAuthorization } from '@/lib/admin-auth'
import { mapAdminUser } from '@/lib/admin-users'
import { mapAdminUserGroup, parseUserGroupId } from '@/lib/admin-user-groups'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{
    groupId: string
  }>
}

async function readAssignmentRequest(
  request: Request
): Promise<Partial<AdminUserGroupUserAssignmentRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminUserGroupUserAssignmentRequest>
  } catch {
    return null
  }
}

function parseUserId(userId: unknown): number | null {
  const parsedUserId = Number(userId)

  return Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null
}

async function buildGroupUsersData(groupId: number): Promise<AdminUserGroupUsersData | null> {
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

  const members = await prisma.userGroupMember.findMany({
    where: { groupId },
    orderBy: {
      customer: {
        email: 'asc',
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          middleName: true,
          lastName: true,
          company: true,
          userGroupMemberships: {
            select: {
              group: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return {
    group: mapAdminUserGroup(group),
    users: members.map((member) => mapAdminUser(member.customer)),
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
    const data = await buildGroupUsersData(parsedGroupId)

    if (!data) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<AdminUserGroupUsersData>>({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Admin user group members fetch error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to fetch group users' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
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
    const body = await readAssignmentRequest(request)
    const parsedUserId = parseUserId(body?.userId)

    if (!body || !parsedUserId) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Valid user id is required' },
        { status: 400 }
      )
    }

    const [group, user] = await Promise.all([
      prisma.userGroup.findUnique({ where: { id: parsedGroupId }, select: { id: true } }),
      prisma.customer.findUnique({ where: { id: parsedUserId }, select: { id: true } }),
    ])

    if (!group) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User group not found' },
        { status: 404 }
      )
    }

    if (!user) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    await prisma.userGroupMember.upsert({
      where: {
        groupId_customerId: {
          groupId: parsedGroupId,
          customerId: parsedUserId,
        },
      },
      update: {},
      create: {
        groupId: parsedGroupId,
        customerId: parsedUserId,
      },
    })

    const data = await buildGroupUsersData(parsedGroupId)

    return NextResponse.json<ApiResponse<AdminUserGroupUsersData>>({
      success: true,
      data: data as AdminUserGroupUsersData,
      message: 'User assigned successfully',
    })
  } catch (error) {
    console.error('Admin user group member assign error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to assign user' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
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
    const body = await readAssignmentRequest(request)
    const parsedUserId = parseUserId(body?.userId)

    if (!body || !parsedUserId) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Valid user id is required' },
        { status: 400 }
      )
    }

    const group = await prisma.userGroup.findUnique({
      where: { id: parsedGroupId },
      select: { id: true },
    })

    if (!group) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'User group not found' },
        { status: 404 }
      )
    }

    await prisma.userGroupMember.deleteMany({
      where: {
        groupId: parsedGroupId,
        customerId: parsedUserId,
      },
    })

    const data = await buildGroupUsersData(parsedGroupId)

    return NextResponse.json<ApiResponse<AdminUserGroupUsersData>>({
      success: true,
      data: data as AdminUserGroupUsersData,
      message: 'User removed successfully',
    })
  } catch (error) {
    console.error('Admin user group member remove error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to remove user' },
      { status: 500 }
    )
  }
}
