import { mapAdminModules, moduleWithSubModulesSelect } from '@/lib/admin-modules'
import { mapAdminUserGroup } from '@/lib/admin-user-groups'
import { adminUserSelect, mapAdminUser } from '@/lib/admin-users'
import { prisma } from '@/lib/prisma'
import {
  AdminModuleSummary,
  AdminRoleSummary,
  AdminUserGroupSummary,
  AdminUserSummary,
} from '@saas/shared-types'

interface AdminRoleWithCounts {
  id: number
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  _count: {
    groups: number
    modules: number
  }
}

export async function getAdminRoles(): Promise<AdminRoleSummary[]> {
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

  return roles.map((role: AdminRoleWithCounts) => ({
    id: role.id.toString(),
    name: role.name,
    description: role.description,
    groupCount: role._count.groups,
    moduleCount: role._count.modules,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  }))
}

export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  const users = await prisma.customer.findMany({
    orderBy: { email: 'asc' },
    select: adminUserSelect,
  })

  return users.map(mapAdminUser)
}

export async function getAdminUserGroups(): Promise<AdminUserGroupSummary[]> {
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

  return userGroups.map(mapAdminUserGroup)
}

export async function getAdminModules(): Promise<AdminModuleSummary[]> {
  const modules = await prisma.module.findMany({
    orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
    select: moduleWithSubModulesSelect,
  })

  return mapAdminModules(modules)
}
