import { NextResponse } from 'next/server'
import { ApiResponse, AdminUsersData } from '@saas/shared-types'
import { getAdminAuthorization } from '@/lib/admin-auth'
import { adminUserSelect, mapAdminUser } from '@/lib/admin-users'
import { prisma } from '@/lib/prisma'

export async function GET(): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  try {
    const users = await prisma.customer.findMany({
      orderBy: { email: 'asc' },
      select: adminUserSelect,
    })

    return NextResponse.json<ApiResponse<AdminUsersData>>({
      success: true,
      data: {
        users: users.map(mapAdminUser),
      },
    })
  } catch (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
