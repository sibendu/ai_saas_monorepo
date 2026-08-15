import { NextResponse } from 'next/server'
import { ApiResponse, AdminRoleMutationRequest, AdminRolesData, AdminRoleSummary } from '@saas/shared-types'
import { writeAdminAuditLog } from '@/lib/admin-audit'
import { getAdminAuthorization } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

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

export async function GET(): Promise<NextResponse> {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status }
    )
  }

  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            groups: true,
            modules: true,
          },
        },
      },
    })

    return NextResponse.json<ApiResponse<AdminRolesData>>({
      success: true,
      data: {
        roles: roles.map(mapRole),
      },
    })
  } catch (error) {
    console.error('Admin roles fetch error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to fetch roles' },
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

    const existingRole = await prisma.role.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    })

    if (existingRole) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A role with this name already exists' },
        { status: 409 }
      )
    }

    const role = await prisma.$transaction(async (tx) => {
      const createdRole = await tx.role.create({
        data: {
          name,
          description: normalizeDescription(body.description),
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

      await writeAdminAuditLog(tx, {
        actor: authorization,
        action: 'ROLE_CREATED',
        entityType: 'ROLE',
        entityId: createdRole.id.toString(),
        entityLabel: createdRole.name,
        targetRoleId: createdRole.id,
        metadata: { roleName: createdRole.name },
      })

      return createdRole
    })

    return NextResponse.json<ApiResponse<AdminRoleSummary>>(
      { success: true, data: mapRole(role), message: 'Role created successfully' },
      { status: 201 }
    )
  } catch (error) {
    if (getPrismaErrorCode(error) === 'P2002') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'A role with this name already exists' },
        { status: 409 }
      )
    }

    console.error('Admin role create error:', error)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Failed to create role' },
      { status: 500 }
    )
  }
}
