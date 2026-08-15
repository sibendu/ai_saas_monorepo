import AppShell from '@/components/AppShell'
import RoleManagement from '@/components/admin/RoleManagement'
import { requireAdminSession } from '@/lib/admin-auth'
import { getAdminRoles } from '@/lib/admin-page-data'
import { getAuthenticatedShellData } from '@/lib/role-menu'

export default async function AdminRolesPage() {
  await requireAdminSession()
  const [{ session, menuSections, menuLayout }, roles] = await Promise.all([
    getAuthenticatedShellData(),
    getAdminRoles(),
  ])

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Admin"
      pageSubtitle="Roles"
    >
      <RoleManagement initialRoles={roles} />
    </AppShell>
  )
}
