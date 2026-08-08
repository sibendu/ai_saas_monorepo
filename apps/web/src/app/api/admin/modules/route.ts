import { NextResponse } from 'next/server'
import type {
  AdminModuleMutationRequest,
  AdminModuleSummary,
  AdminModulesData,
  ApiResponse,
} from '@saas/shared-types'

import { getAdminAuthorization } from '@/lib/admin-auth'
import { mapAdminModule, mapAdminModules, moduleWithSubModulesSelect } from '@/lib/admin-modules'
import { prisma } from '@/lib/prisma'

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : null
}

function normalizeModuleLabel(label: unknown): string {
  return typeof label === 'string' ? label.trim() : ''
}

async function readModuleMutationRequest(
  request: Request
): Promise<Partial<AdminModuleMutationRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminModuleMutationRequest>
  } catch {
    return null
  }
}

function getPrismaErrorCode(error: unknown): string | null {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : null
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

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  try {
    const body = await readModuleMutationRequest(request)

    if (!body) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const label = normalizeModuleLabel(body.label)

    if (!label) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Module label is required' },
        { status: 400 }
      )
    }

    const existingModule = await prisma.module.findFirst({
      where: {
        label: {
          equals: label,
          mode: 'insensitive',
        },
      },
    })

    if (existingModule) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A module with this label already exists' },
        { status: 409 }
      )
    }

    const module = await prisma.module.create({
      data: {
        label,
        icon: normalizeOptionalString(body.icon),
        href: normalizeOptionalString(body.href),
      },
      select: moduleWithSubModulesSelect,
    })

    return NextResponse.json<ApiResponse<AdminModuleSummary>>(
      { success: true, data: mapAdminModule(module), message: 'Module created successfully' },
      { status: 201 }
    )
  } catch (error) {
    if (getPrismaErrorCode(error) === 'P2002') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A module with this label already exists' },
        { status: 409 }
      )
    }

    console.error('Admin module create error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to create module' },
      { status: 500 }
    )
  }
}
