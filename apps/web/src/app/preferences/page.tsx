import PreferencesForm from './PreferencesForm'
import { prisma } from '@/lib/prisma'
import { buildDisplayName, splitDisplayName } from '@/lib/profile'
import { getAuthenticatedShellData } from '@/lib/role-menu'

interface PreferencesUser {
  name?: string | null
  email?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  dob?: string | null
  company?: string | null
  addresses?: {
    type: 'PERMANENT' | 'COMMUNICATION'
    addressLine1: string
    addressLine2: string
    addressLine3?: string | null
    city: string
    district: string
    state: string
    country: string
    pin: string
  }[]
  contacts?: {
    type: 'MOBILE' | 'OTHER'
    countryCode: string
    contact: string
  }[]
}

async function getPreferencesUser(sessionUser: PreferencesUser): Promise<PreferencesUser> {
  if (!sessionUser.email) {
    return sessionUser
  }

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        email: sessionUser.email,
      },
      select: {
        addresses: {
          orderBy: { id: 'asc' },
          select: {
            addressLine1: true,
            addressLine2: true,
            addressLine3: true,
            city: true,
            country: true,
            district: true,
            pin: true,
            state: true,
            type: true,
          },
        },
        company: true,
        contacts: {
          orderBy: { id: 'asc' },
          select: {
            contact: true,
            countryCode: true,
            type: true,
          },
        },
        dob: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        name: true,
      },
    })

    if (!customer) {
      return sessionUser
    }

    const splitName = splitDisplayName(customer.name ?? sessionUser.name)
    const firstName = customer.firstName ?? splitName.firstName
    const middleName = customer.middleName ?? splitName.middleName
    const lastName = customer.lastName ?? splitName.lastName

    return {
      name: buildDisplayName({
        fallback: customer.name ?? sessionUser.name,
        firstName,
        lastName,
        middleName,
      }),
      email: customer.email ?? sessionUser.email,
      firstName,
      middleName,
      lastName,
      dob: customer.dob ? customer.dob.toISOString().slice(0, 10) : null,
      company: customer.company,
      addresses: customer.addresses,
      contacts: customer.contacts,
    }
  } catch (error) {
    console.error('Failed to load preferences:', error)
    return sessionUser
  }
}

export default async function PreferencesPage() {
  const { session, menuSections, menuLayout } = await getAuthenticatedShellData()
  const user = await getPreferencesUser(session.user ?? {})

  return <PreferencesForm user={user} menuSections={menuSections} menuLayout={menuLayout} />
}
