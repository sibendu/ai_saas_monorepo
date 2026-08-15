import AppShell from '@/components/AppShell'
import { getAuthenticatedShellData } from '@/lib/role-menu'

export default async function UnimplementedFeaturePage() {
  const { session, menuSections, menuLayout } = await getAuthenticatedShellData()

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Feature unavailable"
      pageSubtitle="This area is not ready yet"
    >
      <section className="bg-white rounded-lg shadow p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">This feature is not implemented yet</h2>
      </section>
    </AppShell>
  )
}
