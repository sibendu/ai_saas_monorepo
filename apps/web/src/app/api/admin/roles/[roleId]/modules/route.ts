import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import type {
  AdminRoleModuleMappingData,
  AdminRoleModuleMappingRequest,
  ApiResponse,
} from '@saas/shared-types'

import { getAdminAuthorization } from '@/lib/admin-auth'
import {
  mapRoleModuleMapping,
  normalizePositiveIntegerStringIds,
  parsePositiveIntegerString,
} from '@/lib/admin-modules'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{
    roleId: string
  }>
}

interface SelectedSubModule {
  id: number
  moduleId: number
}

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json<ApiResponse<never>>({ success: false, error }, { status })
}

async function readRoleModuleMappingRequest(
  request: Request
): Promise<Partial<AdminRoleModuleMappingRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminRoleModuleMappingRequest>
  } catch {
    return null
  }
}

function toStringIds(ids: number[]): string[] {
  return ids.map((id) => id.toString())
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  const { roleId } = await context.params
  const parsedRoleId = parsePositiveIntegerString(roleId)

  if (!parsedRoleId) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Invalid role id' },
      { status: 400 }
    )
  }

  try {
    const role = await prisma.role.findUnique({
      where: { id: parsedRoleId },
      select: { id: true },
    })

    if (!role) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Role not found' },
        { status: 404 }
      )
    }

    const mappings = await prisma.roleModule.findMany({
      where: { roleId: parsedRoleId },
      orderBy: [{ moduleId: 'asc' }, { subModuleId: 'asc' }],
      select: {
        moduleId: true,
        subModuleId: true,
      },
    })

    return NextResponse.json<ApiResponse<AdminRoleModuleMappingData>>({
      success: true,
      data: mapRoleModuleMapping(parsedRoleId, mappings),
    })
  } catch (error) {
    console.error('Admin role module access fetch error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to fetch role module access' },
      { status: 500 }
    )
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

  const { roleId } = await context.params
  const parsedRoleId = parsePositiveIntegerString(roleId)

  if (!parsedRoleId) {
    return jsonError('Invalid role id', 400)
  }

  try {
    const body = await readRoleModuleMappingRequest(request)

    if (!body) {
      return jsonError('Invalid JSON request body', 400)
    }

    if (!Array.isArray(body.moduleIds)) {
      return jsonError('moduleIds must be an array', 400)
    }

    if (!Array.isArray(body.subModuleIds)) {
      return jsonError('subModuleIds must be an array', 400)
    }

    const moduleIds = normalizePositiveIntegerStringIds(body.moduleIds)

    if (!moduleIds) {
      return jsonError('Module ids must be unique positive integers', 400)
    }

    const subModuleIds = normalizePositiveIntegerStringIds(body.subModuleIds)

    if (!subModuleIds) {
      return jsonError('Sub-module ids must be unique positive integers', 400)
    }

    const role = await prisma.role.findUnique({
      where: { id: parsedRoleId },
      select: { id: true, name: true },
    })

    if (!role) {
      return jsonError('Role not found', 404)
    }

    if (moduleIds.length > 0) {
      const existingModules = await prisma.module.findMany({
        where: {
          id: {
            in: moduleIds,
          },
        },
        select: {
          id: true,
        },
      })

      if (existingModules.length !== moduleIds.length) {
        return jsonError('One or more modules were not found', 400)
      }
    }

    let selectedSubModules: SelectedSubModule[] = []

    if (subModuleIds.length > 0) {
      selectedSubModules = await prisma.subModule.findMany({
        where: {
          id: {
            in: subModuleIds,
          },
        },
        select: {
          id: true,
          moduleId: true,
        },
      })

      if (selectedSubModules.length !== subModuleIds.length) {
        return jsonError('One or more sub-modules were not found', 400)
      }

      const selectedModuleIds = new Set(moduleIds)
      const hasParentMismatch = selectedSubModules.some(
        (subModule) => !selectedModuleIds.has(subModule.moduleId)
      )

      if (hasParentMismatch) {
        return jsonError('Sub-module does not belong to a selected module', 400)
      }
    }

    if (role.name.toLowerCase() === 'admin' && moduleIds.length === 0 && subModuleIds.length === 0) {
      return jsonError('Admin role must retain module access', 409)
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.roleModule.deleteMany({
        where: {
          roleId: parsedRoleId,
        },
      })

      const roleModuleRows = [
        ...moduleIds.map((moduleId) => ({
          roleId: parsedRoleId,
          moduleId,
          subModuleId: null,
        })),
        ...selectedSubModules.map((subModule) => ({
          roleId: parsedRoleId,
          moduleId: subModule.moduleId,
          subModuleId: subModule.id,
        })),
      ]

      if (roleModuleRows.length > 0) {
        await tx.roleModule.createMany({
          data: roleModuleRows,
        })
      }
    })

    const normalizedModuleIds = toStringIds(moduleIds)
    const normalizedSubModuleIds = toStringIds(subModuleIds)

    console.log('Admin role module access updated:', {
      actorEmail: authorization.customer.email,
      roleId: parsedRoleId,
      moduleIds: normalizedModuleIds,
      subModuleIds: normalizedSubModuleIds,
    })

    return NextResponse.json<ApiResponse<AdminRoleModuleMappingData>>({
      success: true,
      data: {
        roleId: parsedRoleId.toString(),
        moduleIds: normalizedModuleIds,
        subModuleIds: normalizedSubModuleIds,
      },
      message: 'Role module access updated successfully',
    })
  } catch (error) {
    console.error('Admin role module access update error:', error)
    return jsonError('Failed to update role module access', 500)
  }
}
