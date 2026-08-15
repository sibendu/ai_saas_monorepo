import AppShell from '@/components/AppShell'
import AuditLogViewer from '@/components/admin/AuditLogViewer'
import { requireAdminSession } from '@/lib/admin-auth'
import { getAuthenticatedShellData } from '@/lib/role-menu'

export default async function AdminLogsPage() {
  await requireAdminSession()
  const { session, menuSections, menuLayout } = await getAuthenticatedShellData()

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Admin"
      pageSubtitle="Logs"
    >
      <AuditLogViewer />
    </AppShell>
  )
}
