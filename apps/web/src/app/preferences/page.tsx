import PreferencesForm from './PreferencesForm'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedShellData } from '@/lib/role-menu'

interface PreferencesUser {
  name?: string | null
  email?: string | null
  company?: string | null
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
        company: true,
        email: true,
        name: true,
      },
    })

    if (!customer) {
      return sessionUser
    }

    return {
      name: customer.name ?? sessionUser.name,
      email: customer.email ?? sessionUser.email,
      company: customer.company,
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
