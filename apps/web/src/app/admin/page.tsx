import AppShell from '@/components/AppShell'
import AdminManagementTabs from '@/components/admin/AdminManagementTabs'
import { requireAdminSession } from '@/lib/admin-auth'
import { mapAdminModules, moduleWithSubModulesSelect } from '@/lib/admin-modules'
import { adminUserSelect, mapAdminUser } from '@/lib/admin-users'
import { getAuthenticatedShellData } from '@/lib/role-menu'
import { prisma } from '@/lib/prisma'
import { AdminModuleSummary, AdminRoleSummary, AdminUserSummary } from '@saas/shared-types'

interface AdminRoleWithCounts {
  id: number
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  _count: {
    users: number
    modules: number
  }
}

async function getRoles(): Promise<AdminRoleSummary[]> {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          users: true,
          modules: true,
        },
      },
    },
  })

  return roles.map((role: AdminRoleWithCounts) => ({
    id: role.id.toString(),
    name: role.name,
    description: role.description,
    userCount: role._count.users,
    moduleCount: role._count.modules,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  }))
}

async function getUsers(): Promise<AdminUserSummary[]> {
  const users = await prisma.customer.findMany({
    orderBy: { email: 'asc' },
    select: adminUserSelect,
  })

  return users.map(mapAdminUser)
}

async function getModules(): Promise<AdminModuleSummary[]> {
  const modules = await prisma.module.findMany({
    orderBy: { label: 'asc' },
    select: moduleWithSubModulesSelect,
  })

  return mapAdminModules(modules)
}

export default async function AdminPage() {
  await requireAdminSession()
  const [{ session, menuSections, menuLayout }, roles, users, modules] = await Promise.all([
    getAuthenticatedShellData(),
    getRoles(),
    getUsers(),
    getModules(),
  ])

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Admin"
      pageSubtitle="Manage access, roles, and permissions"
    >
      <AdminManagementTabs initialRoles={roles} initialUsers={users} initialModules={modules} />
    </AppShell>
  )
}
