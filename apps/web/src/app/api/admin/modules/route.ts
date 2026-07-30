import { NextResponse } from 'next/server'
import type { AdminModulesData, ApiResponse } from '@saas/shared-types'

import { getAdminAuthorization } from '@/lib/admin-auth'
import { mapAdminModules, moduleWithSubModulesSelect } from '@/lib/admin-modules'
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
    const modules = await prisma.module.findMany({
      orderBy: { label: 'asc' },
      select: moduleWithSubModulesSelect,
    })

    return NextResponse.json<ApiResponse<AdminModulesData>>({
      success: true,
      data: {
        modules: mapAdminModules(modules),
      },
    })
  } catch (error) {
    console.error('Admin modules fetch error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to fetch modules' },
      { status: 500 }
    )
  }
}
