import { CustomersResponse } from '@saas/shared-types'
import CustomersList from '@/components/CustomersList'
import AppShell from '@/components/AppShell'
import { getAuthenticatedShellData } from '@/lib/role-menu'

interface CustomersPageProps {
  searchParams?: Promise<{
    name?: string
    company?: string
    email?: string
    page?: string
    pageSize?: string
  }>
}

function normalizePage(value: string | undefined): string {
  return value && /^[1-9]\d*$/.test(value) ? value : '1'
}

function normalizePageSize(value: string | undefined): string {
  return ['5', '10', '25'].includes(value ?? '') ? value as string : '10'
}

async function getCustomers(params: {
  name: string
  company: string
  email: string
  page: string
  pageSize: string
}): Promise<CustomersResponse | null> {
  try {
    // In production, use the private/internal BFF URL
    const bffUrl = process.env.BFF_INTERNAL_URL || process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'
    const url = new URL('/api/customers', bffUrl)
    url.searchParams.set('page', params.page)
    url.searchParams.set('pageSize', params.pageSize)

    if (params.name) {
      url.searchParams.set('name', params.name)
    }

    if (params.company) {
      url.searchParams.set('company', params.company)
    }

    if (params.email) {
      url.searchParams.set('email', params.email)
    }
    
    const response = await fetch(url.toString(), {
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

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { session, menuSections, menuLayout } = await getAuthenticatedShellData()
  const resolvedSearchParams = await searchParams
  const name = (resolvedSearchParams?.name ?? '').trim()
  const company = (resolvedSearchParams?.company ?? '').trim()
  const email = (resolvedSearchParams?.email ?? '').trim()
  const page = normalizePage(resolvedSearchParams?.page)
  const pageSize = normalizePageSize(resolvedSearchParams?.pageSize)

  const customersData = await getCustomers({ name, company, email, page, pageSize })

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Customers"
      pageSubtitle="Manage and view your customer database"
    >
      {customersData ? (
        <CustomersList data={customersData} />
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600">Failed to load customers. Please try again later.</p>
        </div>
      )}
    </AppShell>
  )
}
