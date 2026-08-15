import AppShell from '@/components/AppShell'
import UserGroupManagement from '@/components/admin/UserGroupManagement'
import { requireAdminSession } from '@/lib/admin-auth'
import { getAdminRoles, getAdminUserGroups, getAdminUsers } from '@/lib/admin-page-data'
import { getAuthenticatedShellData } from '@/lib/role-menu'

export default async function AdminGroupsPage() {
  await requireAdminSession()
  const [{ session, menuSections, menuLayout }, userGroups, users, roles] = await Promise.all([
    getAuthenticatedShellData(),
    getAdminUserGroups(),
    getAdminUsers(),
    getAdminRoles(),
  ])

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Admin"
      pageSubtitle="Groups"
    >
      <UserGroupManagement initialUserGroups={userGroups} initialUsers={users} availableRoles={roles} />
    </AppShell>
  )
}
