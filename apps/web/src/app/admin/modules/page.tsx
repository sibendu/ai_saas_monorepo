import AppShell from '@/components/AppShell'
import AdminModulesPage from '@/components/admin/AdminModulesPage'
import { requireAdminSession } from '@/lib/admin-auth'
import { getAdminModules } from '@/lib/admin-page-data'
import { getAuthenticatedShellData } from '@/lib/role-menu'

export default async function AdminModulesRoutePage() {
  await requireAdminSession()
  const [{ session, menuSections, menuLayout }, modules] = await Promise.all([
    getAuthenticatedShellData(),
    getAdminModules(),
  ])

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Admin"
      pageSubtitle="Modules"
    >
      <AdminModulesPage initialModules={modules} />
    </AppShell>
  )
}
