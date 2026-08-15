import AppShell from '@/components/AppShell'
import UserManagement from '@/components/admin/UserManagement'
import { requireAdminSession } from '@/lib/admin-auth'
import {
  getAdminUserGroups,
  getAdminUsers,
} from '@/lib/admin-page-data'
import { getAuthenticatedShellData } from '@/lib/role-menu'

export default async function AdminUsersPage() {
  await requireAdminSession()
  const [{ session, menuSections, menuLayout }, users, userGroups] = await Promise.all([
    getAuthenticatedShellData(),
    getAdminUsers(),
    getAdminUserGroups(),
  ])

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Admin"
      pageSubtitle="Users"
    >
      <UserManagement initialUsers={users} availableGroups={userGroups} />
    </AppShell>
  )
}
