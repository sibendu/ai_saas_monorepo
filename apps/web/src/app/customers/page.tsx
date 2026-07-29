import { CustomersResponse } from '@saas/shared-types'
import CustomersList from '@/components/CustomersList'
import AppShell from '@/components/AppShell'
import { getAuthenticatedShellData } from '@/lib/role-menu'

async function getCustomers(): Promise<CustomersResponse | null> {
  try {
    // In production, use the private/internal BFF URL
    const bffUrl = process.env.BFF_INTERNAL_URL || process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'
    
    const response = await fetch(`${bffUrl}/api/customers`, {
      cache: 'no-store', // Always fetch fresh data
    })

    if (!response.ok) {
      console.error('Failed to fetch customers:', response.statusText)
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching customers:', error)
    return null
  }
}

export default async function CustomersPage() {
  const { session, menuSections, menuLayout } = await getAuthenticatedShellData()

  const customersData = await getCustomers()

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Customers"
      pageSubtitle="Manage and view your customer database"
    >
      {customersData ? (
        <CustomersList customers={customersData.customers} total={customersData.total} />
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600">Failed to load customers. Please try again later.</p>
        </div>
      )}
    </AppShell>
  )
}
