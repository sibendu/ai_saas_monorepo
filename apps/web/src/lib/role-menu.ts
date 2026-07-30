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

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string'
}

function isAllowedSubModule(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const subModule = value as Record<string, unknown>

  return (
    typeof subModule.id === 'string' &&
    typeof subModule.label === 'string' &&
    typeof subModule.href === 'string' &&
    isOptionalString(subModule.icon)
  )
}

function isAllowedModule(value: unknown): value is AllowedModule {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const module = value as Record<string, unknown>

  return (
    typeof module.id === 'string' &&
    typeof module.label === 'string' &&
    isOptionalString(module.icon) &&
    isOptionalString(module.href) &&
    Array.isArray(module.subModules) &&
    module.subModules.every(isAllowedSubModule)
  )
}

function isSuccessfulUserRolesResponse(payload: unknown): payload is UserRolesResponse {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }

  const response = payload as Record<string, unknown>

  return (
    response.success === true &&
    Array.isArray(response.modules) &&
    response.modules.every(isAllowedModule)
  )
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

      const payload: unknown = await response.json()

      if (!isSuccessfulUserRolesResponse(payload)) {
        console.error('Invalid role menu payload:', bffUrl)
        continue
      }

      const allowedMenuSections = mapAllowedModulesToMenuSections(payload.modules)

      return allowedMenuSections
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
