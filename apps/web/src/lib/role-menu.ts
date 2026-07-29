import {
  getConfiguredMenuLayout,
  MenuIconKey,
  MenuSectionConfig,
  menuSections,
} from '@/config/navigation'
import { isSessionUserAdmin } from '@/lib/admin-auth'
import { requireAuthenticatedSession } from '@/lib/auth'
import { AllowedModule, UserRolesResponse } from '@saas/shared-types'

const knownMenuIcons = new Set<MenuIconKey>([
  'users',
  'profile',
  'workspace',
  'settings',
  'menu',
  'close',
  'chevron',
])

function normalizeIcon(icon: string | null | undefined, fallback: MenuIconKey): MenuIconKey {
  return icon && knownMenuIcons.has(icon as MenuIconKey) ? (icon as MenuIconKey) : fallback
}

function getRoleMenuUrls(): string[] {
  const configuredUrls = [
    process.env.BFF_INTERNAL_URL,
    process.env.NEXT_PUBLIC_BFF_URL,
    'http://localhost:3001',
  ].filter((value): value is string => Boolean(value))

  const fallbackUrls = configuredUrls.flatMap((value) => {
    if (value.includes(':3000')) {
      return [value, value.replace(':3000', ':3001')]
    }

    return [value]
  })

  return [...new Set(fallbackUrls)]
}

export function mapAllowedModulesToMenuSections(modules: AllowedModule[]): MenuSectionConfig[] {
  return modules
    .filter((module) => module.href || module.subModules.length > 0)
    .map((module) => ({
      id: module.id,
      label: module.label,
      icon: normalizeIcon(module.icon, 'workspace'),
      items:
        module.subModules.length > 0
          ? module.subModules.map((subModule) => ({
              label: subModule.label,
              href: subModule.href,
              icon: normalizeIcon(subModule.icon, 'chevron'),
            }))
          : [
              {
                label: module.label,
                href: module.href ?? '/dashboard',
                icon: normalizeIcon(module.icon, 'workspace'),
              },
            ],
    }))
}

export async function getAllowedMenuSections(email: string | null | undefined): Promise<MenuSectionConfig[]> {
  if (!email) {
    return menuSections
  }

  const roleMenuUrls = getRoleMenuUrls()

  for (const bffUrl of roleMenuUrls) {
    try {
      const response = await fetch(`${bffUrl}/api/user/roles?email=${encodeURIComponent(email)}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        console.error('Failed to fetch role menu:', bffUrl, response.status, response.statusText)
        continue
      }

      const payload = (await response.json()) as UserRolesResponse
      const allowedMenuSections = mapAllowedModulesToMenuSections(payload.modules)

      return allowedMenuSections.length > 0 ? allowedMenuSections : menuSections
    } catch (error) {
      console.error('Error fetching role menu:', bffUrl, error)
    }
  }

  return menuSections
}

function withAdminMenuSection(sections: MenuSectionConfig[]): MenuSectionConfig[] {
  if (sections.some((section) => section.id === 'admin')) {
    return sections
  }

  return [
    ...sections,
    {
      id: 'admin',
      label: 'Admin',
      icon: 'settings',
      items: [
        {
          label: 'Admin',
          href: '/admin',
          icon: 'settings',
        },
      ],
    },
  ]
}

export async function getAuthenticatedShellData() {
  const session = await requireAuthenticatedSession()
  const [allowedMenuSections, isAdmin] = await Promise.all([
    getAllowedMenuSections(session.user?.email),
    isSessionUserAdmin(session.user?.email),
  ])

  return {
    session,
    menuSections: isAdmin ? withAdminMenuSection(allowedMenuSections) : allowedMenuSections,
    menuLayout: getConfiguredMenuLayout(),
  }
}
