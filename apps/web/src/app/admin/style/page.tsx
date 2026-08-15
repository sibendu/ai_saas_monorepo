import AppShell from '@/components/AppShell'
import StyleManagement from '@/components/admin/StyleManagement'
import { requireAdminSession } from '@/lib/admin-auth'
import { getAuthenticatedShellData } from '@/lib/role-menu'

export default async function AdminStylePage() {
  await requireAdminSession()
  const { session, menuSections, menuLayout } = await getAuthenticatedShellData()

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Admin"
      pageSubtitle="Style"
    >
      <StyleManagement />
    </AppShell>
  )
}
