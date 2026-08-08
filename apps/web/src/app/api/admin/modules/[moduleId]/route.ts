import { NextResponse } from 'next/server'
import type { AdminModuleMutationRequest, AdminModuleSummary, ApiResponse } from '@saas/shared-types'

import { getAdminAuthorization } from '@/lib/admin-auth'
import { mapAdminModule, moduleWithSubModulesSelect } from '@/lib/admin-modules'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{
    moduleId: string
  }>
}

function parseModuleId(moduleId: string): number | null {
  const parsedModuleId = Number(moduleId)

  return Number.isInteger(parsedModuleId) && parsedModuleId > 0 ? parsedModuleId : null
}

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

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  const { moduleId } = await context.params
  const parsedModuleId = parseModuleId(moduleId)

  if (!parsedModuleId) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Invalid module id' },
      { status: 400 }
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

    const currentModule = await prisma.module.findUnique({
      where: { id: parsedModuleId },
      select: { id: true },
    })

    if (!currentModule) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Module not found' },
        { status: 404 }
      )
    }

    const existingModule = await prisma.module.findFirst({
      where: {
        label: {
          equals: label,
          mode: 'insensitive',
        },
        NOT: {
          id: parsedModuleId,
        },
      },
    })

    if (existingModule) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A module with this label already exists' },
        { status: 409 }
      )
    }

    const module = await prisma.module.update({
      where: { id: parsedModuleId },
      data: {
        label,
        icon: normalizeOptionalString(body.icon),
        href: normalizeOptionalString(body.href),
      },
      select: moduleWithSubModulesSelect,
    })

    return NextResponse.json<ApiResponse<AdminModuleSummary>>({
      success: true,
      data: mapAdminModule(module),
      message: 'Module updated successfully',
    })
  } catch (error) {
    const prismaErrorCode = getPrismaErrorCode(error)

    if (prismaErrorCode === 'P2025') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Module not found' },
        { status: 404 }
      )
    }

    if (prismaErrorCode === 'P2002') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A module with this label already exists' },
        { status: 409 }
      )
    }

    console.error('Admin module update error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to update module' },
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

  const { moduleId } = await context.params
  const parsedModuleId = parseModuleId(moduleId)

  if (!parsedModuleId) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Invalid module id' },
      { status: 400 }
    )
  }

  try {
    const module = await prisma.module.findUnique({
      where: { id: parsedModuleId },
      include: {
        _count: {
          select: {
            roleLinks: true,
          },
        },
      },
    })

    if (!module) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Module not found' },
        { status: 404 }
      )
    }

    if (module._count.roleLinks > 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Module cannot be deleted while assigned to roles' },
        { status: 409 }
      )
    }

    await prisma.module.delete({
      where: { id: parsedModuleId },
    })

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id: module.id.toString() },
      message: 'Module deleted successfully',
    })
  } catch (error) {
    console.error('Admin module delete error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to delete module' },
      { status: 500 }
    )
  }
}
