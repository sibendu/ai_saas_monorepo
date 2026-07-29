import type { Session } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth'

interface AdminCustomer {
  id: number
  email: string
  name: string
  company: string | null
}

interface AdminAuthorizationAllowed {
  isAuthorized: true
  session: Session
  customer: AdminCustomer
}

interface AdminAuthorizationDenied {
  isAuthorized: false
  status: 401 | 403 | 500
  error: string
}

export type AdminAuthorizationResult = AdminAuthorizationAllowed | AdminAuthorizationDenied

interface CustomerRoleLink {
  role: {
    name: string
  }
}

async function findCustomerWithRoles(email: string) {
  return prisma.customer.findFirst({
    where: { email },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  })
}

function hasAdminRole(customer: Awaited<ReturnType<typeof findCustomerWithRoles>>): boolean {
  return (
    customer?.userRoles?.some(
      (userRole: CustomerRoleLink) => userRole.role.name.toLowerCase() === 'admin'
    ) ?? false
  )
}

export async function getAdminAuthorization(): Promise<AdminAuthorizationResult> {
  const session = await getCurrentSession()
  const email = session?.user?.email?.toLowerCase().trim()

  if (!session || !email) {
    return {
      isAuthorized: false,
      status: 401,
      error: 'Unauthorized',
    }
  }

  let customer: Awaited<ReturnType<typeof findCustomerWithRoles>>

  try {
    customer = await findCustomerWithRoles(email)
  } catch (error) {
    console.error('Admin authorization lookup failed:', error)
    return {
      isAuthorized: false,
      status: 500,
      error: 'Failed to verify admin access',
    }
  }

  if (!customer || !hasAdminRole(customer)) {
    return {
      isAuthorized: false,
      status: 403,
      error: 'Admin access required',
    }
  }

  return {
    isAuthorized: true,
    session,
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      company: customer.company,
    },
  }
}

export async function requireAdminSession() {
  const authorization = await getAdminAuthorization()

  if (!authorization.isAuthorized) {
    redirect(authorization.status === 401 ? '/login' : '/dashboard')
  }

  return authorization
}

export async function isSessionUserAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) {
    return false
  }

  try {
    const customer = await findCustomerWithRoles(email.toLowerCase().trim())

    return hasAdminRole(customer)
  } catch (error) {
    console.error('Admin menu role check failed:', error)
    return false
  }
}
