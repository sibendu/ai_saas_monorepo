import type { Prisma } from '@prisma/client'
import {
  AdminModuleSummary,
  AdminRoleModuleMappingData,
  AdminSubModuleSummary,
} from '@saas/shared-types'

export const moduleWithSubModulesSelect = {
  id: true,
  label: true,
  icon: true,
  href: true,
  subModules: {
    orderBy: {
      label: 'asc',
    },
    select: {
      id: true,
      moduleId: true,
      label: true,
      icon: true,
      href: true,
    },
  },
} satisfies Prisma.ModuleSelect

export type AdminModuleWithSubModules = Prisma.ModuleGetPayload<{
  select: typeof moduleWithSubModulesSelect
}>

interface RoleModuleMappingRow {
  moduleId: number
  subModuleId: number | null
}

function toStringId(id: number): string {
  return id.toString()
}

export function mapAdminModule(module: AdminModuleWithSubModules): AdminModuleSummary {
  return {
    id: toStringId(module.id),
    label: module.label,
    icon: module.icon,
    href: module.href,
    subModules: module.subModules.map(
      (subModule): AdminSubModuleSummary => ({
        id: toStringId(subModule.id),
        moduleId: toStringId(subModule.moduleId),
        label: subModule.label,
        icon: subModule.icon,
        href: subModule.href,
      })
    ),
  }
}

export function mapAdminModules(modules: AdminModuleWithSubModules[]): AdminModuleSummary[] {
  return modules.map(mapAdminModule)
}

export function mapRoleModuleMapping(
  roleId: number,
  mappings: RoleModuleMappingRow[]
): AdminRoleModuleMappingData {
  return {
    roleId: toStringId(roleId),
    moduleIds: mappings
      .filter((mapping) => mapping.subModuleId === null)
      .map((mapping) => toStringId(mapping.moduleId)),
    subModuleIds: mappings
      .filter((mapping): mapping is RoleModuleMappingRow & { subModuleId: number } => {
        return mapping.subModuleId !== null
      })
      .map((mapping) => toStringId(mapping.subModuleId)),
  }
}

export function parsePositiveIntegerString(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null
  }

  const parsedValue = Number(value)

  return Number.isSafeInteger(parsedValue) ? parsedValue : null
}

export function normalizePositiveIntegerStringIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const normalizedIds: number[] = []
  const uniqueIds = new Set<number>()

  for (const item of value) {
    const parsedId = parsePositiveIntegerString(item)

    if (!parsedId || uniqueIds.has(parsedId)) {
      return null
    }

    uniqueIds.add(parsedId)
    normalizedIds.push(parsedId)
  }

  return normalizedIds
}
