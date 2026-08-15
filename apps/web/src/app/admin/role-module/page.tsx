import AppShell from '@/components/AppShell'
import RoleModuleManagement from '@/components/admin/RoleModuleManagement'
import { requireAdminSession } from '@/lib/admin-auth'
import { getAdminModules, getAdminRoles } from '@/lib/admin-page-data'
import { getAuthenticatedShellData } from '@/lib/role-menu'

export default async function AdminRoleModulePage() {
  await requireAdminSession()
  const [{ session, menuSections, menuLayout }, roles, modules] = await Promise.all([
    getAuthenticatedShellData(),
    getAdminRoles(),
    getAdminModules(),
  ])

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Admin"
      pageSubtitle="Role-Module"
    >
      <RoleModuleManagement initialRoles={roles} initialModules={modules} />
    </AppShell>
  )
}
