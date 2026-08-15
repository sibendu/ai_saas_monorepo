import {
  getConfiguredMenuLayout,
  MenuIconKey,
  MenuSectionConfig,
  menuSections,
} from '@/config/navigation'
import { requireAuthenticatedSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AllowedModule, Role, UserRolesResponse } from '@saas/shared-types'

const knownMenuIcons = new Set<MenuIconKey>([
  'users',
  'profile',
  'workspace',
  'settings',
  'menu',
  'close',
  'chevron',
])

interface RoleMenuModule {
  id: number
  parentModuleId: number | null
  label: string
  displayOrder: number
  icon: string | null
  href: string | null
  parentModule: RoleMenuModuleParent | null
}

interface RoleMenuModuleParent {
  id: number
  parentModuleId: number | null
  label: string
  displayOrder: number
  icon: string | null
  href: string | null
}

interface RoleMenuSubModule {
  id: number
  label: string
  displayOrder: number
  icon: string | null
  href: string
}

interface GroupRoleWithMenuAccess {
  role: {
    id: number
    name: string
    description: string | null
    modules: Array<{
      module: RoleMenuModule
      subModule: RoleMenuSubModule | null
    }>
  }
}

interface UserGroupMembershipWithMenuAccess {
  group: {
    roles: GroupRoleWithMenuAccess[]
  }
}

interface ConfiguredModule {
  id: number
  parentModuleId: number | null
  label: string
  displayOrder: number
  icon: string | null
  href: string | null
  childModules: Array<{
    id: number
    label: string
    displayOrder: number
    icon: string | null
    href: string | null
  }>
  subModules: Array<{
    id: number
    label: string
    displayOrder: number
    icon: string | null
    href: string
  }>
}

function normalizeIcon(icon: string | null | undefined, fallback: MenuIconKey): MenuIconKey {
  return icon && knownMenuIcons.has(icon as MenuIconKey) ? (icon as MenuIconKey) : fallback
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string'
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === 'number'
}

function isAllowedSubModule(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const subModule = value as Record<string, unknown>

  return (
    typeof subModule.id === 'string' &&
    typeof subModule.label === 'string' &&
    isOptionalNumber(subModule.displayOrder) &&
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
    isOptionalNumber(module.displayOrder) &&
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

function compareByDisplayOrder(
  left: { displayOrder?: number; label: string },
  right: { displayOrder?: number; label: string }
): number {
  const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER
  const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder
  }

  return left.label.localeCompare(right.label)
}

function toSharedRole(role: GroupRoleWithMenuAccess['role']): Role {
  return {
    id: role.id.toString(),
    name: role.name,
    description: role.description,
  }
}

function normalizeMenuHref(href: string): string {
  return href === '/dashboard' ? '/home' : href
}

function normalizeMenuLabel(label: string): string {
  return label === 'Dashboard' ? 'Home' : label
}

function sortAllowedModules(modules: AllowedModule[]): AllowedModule[] {
  return [...modules].sort(compareByDisplayOrder).map((module) => ({
    ...module,
    subModules: [...module.subModules].sort(compareByDisplayOrder),
  }))
}

function resolveAllConfiguredModules(configuredModules: ConfiguredModule[]): AllowedModule[] {
  return sortAllowedModules(
    configuredModules
      .filter((module) => module.parentModuleId === null)
      .map((module) => {
        const childModules =
          module.childModules.length > 0
            ? module.childModules
                .filter((childModule) => childModule.href)
                .map((childModule) => ({
                  id: childModule.id.toString(),
                  label: normalizeMenuLabel(childModule.label),
                  displayOrder: childModule.displayOrder,
                  icon: childModule.icon,
                  href: normalizeMenuHref(childModule.href ?? ''),
                }))
            : module.subModules.map((subModule) => ({
                id: subModule.id.toString(),
                label: normalizeMenuLabel(subModule.label),
                displayOrder: subModule.displayOrder,
                icon: subModule.icon,
                href: normalizeMenuHref(subModule.href),
              }))

        return {
          id: module.id.toString(),
          label: normalizeMenuLabel(module.label),
          displayOrder: module.displayOrder,
          icon: module.icon,
          href: module.href,
          subModules: childModules,
        }
      })
  )
}

function resolveAllowedModules(userRoles: GroupRoleWithMenuAccess[]): AllowedModule[] {
  const modulesById = new Map<string, AllowedModule>()
  const subModuleIdsByModuleId = new Map<string, Set<string>>()

  for (const userRole of userRoles) {
    for (const roleModule of userRole.role.modules) {
      const parentModule = roleModule.module.parentModule
      const isChildModule = roleModule.module.parentModuleId !== null && parentModule
      const menuModule = isChildModule ? parentModule : roleModule.module
      const moduleId = menuModule.id.toString()

      if (!modulesById.has(moduleId)) {
        modulesById.set(moduleId, {
          id: moduleId,
          label: normalizeMenuLabel(menuModule.label),
          displayOrder: menuModule.displayOrder,
          icon: menuModule.icon,
          href: menuModule.href,
          subModules: [],
        })
        subModuleIdsByModuleId.set(moduleId, new Set<string>())
      }

      if (isChildModule) {
        const childModuleId = roleModule.module.id.toString()
        const seenSubModules = subModuleIdsByModuleId.get(moduleId)

        if (!seenSubModules?.has(childModuleId) && roleModule.module.href) {
          modulesById.get(moduleId)?.subModules.push({
            id: childModuleId,
            label: normalizeMenuLabel(roleModule.module.label),
            displayOrder: roleModule.module.displayOrder,
            icon: roleModule.module.icon,
            href: normalizeMenuHref(roleModule.module.href),
          })
          seenSubModules?.add(childModuleId)
        }
      } else if (roleModule.subModule) {
        const subModuleId = roleModule.subModule.id.toString()
        const seenSubModules = subModuleIdsByModuleId.get(moduleId)

        if (!seenSubModules?.has(subModuleId)) {
          modulesById.get(moduleId)?.subModules.push({
            id: subModuleId,
            label: normalizeMenuLabel(roleModule.subModule.label),
            displayOrder: roleModule.subModule.displayOrder,
            icon: roleModule.subModule.icon,
            href: normalizeMenuHref(roleModule.subModule.href),
          })
          seenSubModules?.add(subModuleId)
        }
      }
    }
  }

  return sortAllowedModules([...modulesById.values()])
}

async function getDatabaseRoleMenu(email: string): Promise<UserRolesResponse> {
  const userGroupMemberships = (await prisma.userGroupMember.findMany({
    where: {
      customer: {
        email,
      },
    },
    include: {
      group: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  modules: {
                    orderBy: [{ moduleId: 'asc' }, { subModuleId: 'asc' }],
                    include: {
                      module: {
                        include: {
                          parentModule: true,
                        },
                      },
                      subModule: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })) as UserGroupMembershipWithMenuAccess[]

  const uniqueRoleIds = new Set<number>()
  const userRoles = userGroupMemberships.flatMap((membership) => membership.group.roles)
  const uniqueUserRoles = userRoles.filter((groupRole) => {
    if (uniqueRoleIds.has(groupRole.role.id)) {
      return false
    }

    uniqueRoleIds.add(groupRole.role.id)
    return true
  })
  const roles = uniqueUserRoles.map((userRole) => toSharedRole(userRole.role))
  const hasAdminRole = roles.some((role) => role.name.toLowerCase() === 'admin')
  const modules = hasAdminRole
    ? resolveAllConfiguredModules(
        (await prisma.module.findMany({
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
          include: {
            childModules: {
              orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
            },
            subModules: {
              orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
            },
          },
        })) as ConfiguredModule[]
      )
    : resolveAllowedModules(uniqueUserRoles)

  return {
    success: true,
    roles,
    modules,
  }
}

export function mapAllowedModulesToMenuSections(modules: AllowedModule[]): MenuSectionConfig[] {
  return [...modules]
    .sort(compareByDisplayOrder)
    .filter((module) => module.href || module.subModules.length > 0)
    .map((module) => ({
      id: module.id,
      label: normalizeMenuLabel(module.label),
      icon: normalizeIcon(module.icon, 'workspace'),
      items:
        module.subModules.length > 0
          ? [...module.subModules].sort(compareByDisplayOrder).map((subModule) => ({
              label: normalizeMenuLabel(subModule.label),
              href: normalizeMenuHref(subModule.href),
              icon: normalizeIcon(subModule.icon, 'chevron'),
            }))
          : [
              {
                label: normalizeMenuLabel(module.label),
                href: normalizeMenuHref(module.href ?? '/home'),
                icon: normalizeIcon(module.icon, 'workspace'),
              },
            ],
    }))
}

export async function getUserRoleMenu(email: string | null | undefined): Promise<UserRolesResponse> {
  if (!email) {
    return {
      success: true,
      roles: [],
      modules: [],
    }
  }

  const normalizedEmail = email.toLowerCase().trim()

  if (process.env.DB_PROVIDER === 'sqlite' || process.env.DATABASE_URL?.startsWith('file:')) {
    try {
      return await getDatabaseRoleMenu(normalizedEmail)
    } catch (error) {
      console.error('Error fetching sqlite role menu:', error)
    }
  }

  const roleMenuUrls = getRoleMenuUrls()

  for (const bffUrl of roleMenuUrls) {
    try {
      const response = await fetch(`${bffUrl}/api/user/roles?email=${encodeURIComponent(normalizedEmail)}`, {
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

      return payload
    } catch (error) {
      console.error('Error fetching role menu:', bffUrl, error)
    }
  }

  try {
    return await getDatabaseRoleMenu(normalizedEmail)
  } catch (error) {
    console.error('Error fetching database role menu:', error)
  }

  return {
    success: true,
    roles: [],
    modules: [],
  }
}

export async function getAllowedMenuSections(email: string | null | undefined): Promise<MenuSectionConfig[]> {
  if (!email) {
    return menuSections
  }

  const roleMenu = await getUserRoleMenu(email)
  return mapAllowedModulesToMenuSections(roleMenu.modules)
}

export async function getAuthenticatedShellData() {
  const session = await requireAuthenticatedSession()
  const roleMenu = await getUserRoleMenu(session.user?.email)
  const allowedMenuSections = mapAllowedModulesToMenuSections(roleMenu.modules)

  return {
    session,
    roles: roleMenu.roles,
    menuSections: allowedMenuSections,
    menuLayout: getConfiguredMenuLayout(),
  }
}
