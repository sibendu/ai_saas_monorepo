import { NextResponse } from 'next/server'
import { ApiResponse } from '@saas/shared-types'

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      error: 'Direct user-role assignment has been removed. Assign roles to groups instead.',
    },
    { status: 410 }
  )
}
