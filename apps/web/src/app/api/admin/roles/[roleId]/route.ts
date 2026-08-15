import { NextResponse } from 'next/server'
import { ApiResponse, AdminRoleMutationRequest, AdminRoleSummary } from '@saas/shared-types'
import { writeAdminAuditLog } from '@/lib/admin-audit'
import { getAdminAuthorization } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{
    roleId: string
  }>
}

function mapRole(role: {
  id: number
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  _count: {
    groups: number
    modules: number
  }
}): AdminRoleSummary {
  return {
    id: role.id.toString(),
    name: role.name,
    description: role.description,
    groupCount: role._count.groups,
    moduleCount: role._count.modules,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  }
}

function parseRoleId(roleId: string): number | null {
  const parsedRoleId = Number(roleId)

  return Number.isInteger(parsedRoleId) && parsedRoleId > 0 ? parsedRoleId : null
}

function normalizeDescription(description: unknown): string | null {
  if (typeof description !== 'string') {
    return null
  }

  const trimmedDescription = description.trim()

  return trimmedDescription.length > 0 ? trimmedDescription : null
}

function normalizeRoleName(name: unknown): string {
  return typeof name === 'string' ? name.trim() : ''
}

async function readRoleMutationRequest(request: Request): Promise<Partial<AdminRoleMutationRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminRoleMutationRequest>
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

function isAdminRoleName(name: string): boolean {
  return name.trim().toLowerCase() === 'admin'
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
  const parsedRoleId = parseRoleId(roleId)

  if (!parsedRoleId) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Invalid role id' },
      { status: 400 }
    )
  }

  try {
    const body = await readRoleMutationRequest(request)

    if (!body) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const name = normalizeRoleName(body.name)

    if (!name) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Role name is required' },
        { status: 400 }
      )
    }

    const currentRole = await prisma.role.findUnique({
      where: { id: parsedRoleId },
      select: {
        id: true,
        name: true,
        description: true,
      },
    })

    if (!currentRole) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Role not found' },
        { status: 404 }
      )
    }

    if (isAdminRoleName(currentRole.name) && !isAdminRoleName(name)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'The Admin role name cannot be changed' },
        { status: 409 }
      )
    }

    const existingRole = await prisma.role.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        NOT: {
          id: parsedRoleId,
        },
      },
    })

    if (existingRole) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A role with this name already exists' },
        { status: 409 }
      )
    }

    const description = normalizeDescription(body.description)
    const role = await prisma.$transaction(async (tx) => {
      const updatedRole = await tx.role.update({
        where: { id: parsedRoleId },
        data: {
          name,
          description,
        },
        include: {
          _count: {
            select: {
              groups: true,
              modules: true,
            },
          },
        },
      })

      const changedFields = [
        ...(currentRole.name !== updatedRole.name ? ['name'] : []),
        ...(currentRole.description !== updatedRole.description ? ['description'] : []),
      ]

      await writeAdminAuditLog(tx, {
        actor: authorization,
        action: 'ROLE_UPDATED',
        entityType: 'ROLE',
        entityId: updatedRole.id.toString(),
        entityLabel: updatedRole.name,
        targetRoleId: updatedRole.id,
        metadata: { roleName: updatedRole.name, changedFields },
      })

      return updatedRole
    })

    return NextResponse.json<ApiResponse<AdminRoleSummary>>({
      success: true,
      data: mapRole(role),
      message: 'Role updated successfully',
    })
  } catch (error) {
    const prismaErrorCode = getPrismaErrorCode(error)

    if (prismaErrorCode === 'P2025') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Role not found' },
        { status: 404 }
      )
    }

    if (prismaErrorCode === 'P2002') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A role with this name already exists' },
        { status: 409 }
      )
    }

    console.error('Admin role update error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to update role' },
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

  const { roleId } = await context.params
  const parsedRoleId = parseRoleId(roleId)

  if (!parsedRoleId) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Invalid role id' },
      { status: 400 }
    )
  }

  try {
    const role = await prisma.role.findUnique({
      where: { id: parsedRoleId },
      include: {
        _count: {
          select: {
            groups: true,
            modules: true,
          },
        },
      },
    })

    if (!role) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'Role not found' },
        { status: 404 }
      )
    }

    if (isAdminRoleName(role.name)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'The Admin role cannot be deleted' },
        { status: 409 }
      )
    }

    if (role._count.groups > 0 || role._count.modules > 0) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Role cannot be deleted while it has assigned groups or module access',
        },
        { status: 409 }
      )
    }

    const deleteResult = await prisma.$transaction(async (tx) => {
      const deleted = await tx.role.deleteMany({
        where: {
          id: parsedRoleId,
          groups: { none: {} },
          modules: { none: {} },
        },
      })

      if (deleted.count > 0) {
        await writeAdminAuditLog(tx, {
          actor: authorization,
          action: 'ROLE_DELETED',
          entityType: 'ROLE',
          entityId: role.id.toString(),
          entityLabel: role.name,
          targetRoleId: role.id,
          metadata: { roleName: role.name },
        })
      }

      return deleted
    })

    if (deleteResult.count === 0) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Role cannot be deleted while it has assigned groups or module access',
        },
        { status: 409 }
      )
    }

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id: role.id.toString() },
      message: 'Role deleted successfully',
    })
  } catch (error) {
    console.error('Admin role delete error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to delete role' },
      { status: 500 }
    )
  }
}
