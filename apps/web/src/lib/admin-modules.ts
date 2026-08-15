import type { Prisma } from '@prisma/client'
import type {
  AdminChildModuleSummary,
  AdminModuleSummary,
  AdminRoleModuleMappingData,
  AdminSubModuleSummary,
} from '@saas/shared-types'

export const moduleWithSubModulesSelect = {
  id: true,
  parentModuleId: true,
  label: true,
  displayOrder: true,
  icon: true,
  href: true,
  parentModule: {
    select: {
      id: true,
      label: true,
    },
  },
  _count: {
    select: {
      childModules: true,
    },
  },
  childModules: {
    orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
    select: {
      id: true,
      parentModuleId: true,
      label: true,
      displayOrder: true,
      icon: true,
      href: true,
    },
  },
  subModules: {
    orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
    select: {
      id: true,
      moduleId: true,
      label: true,
      displayOrder: true,
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

function compareByDisplayOrder(
  left: { displayOrder: number; label: string },
  right: { displayOrder: number; label: string }
): number {
  if (left.displayOrder !== right.displayOrder) {
    return left.displayOrder - right.displayOrder
  }

  return left.label.localeCompare(right.label)
}

function uniqueSortedStringIds(ids: number[]): string[] {
  return [...new Set(ids)].sort((left, right) => left - right).map(toStringId)
}

export function mapAdminModule(module: AdminModuleWithSubModules): AdminModuleSummary {
  return {
    id: toStringId(module.id),
    parentModuleId: module.parentModuleId ? toStringId(module.parentModuleId) : null,
    parentModuleLabel: module.parentModule?.label ?? null,
    label: module.label,
    displayOrder: module.displayOrder,
    icon: module.icon,
    href: module.href,
    childModuleCount: module._count.childModules,
    childModules: [...(module.childModules ?? [])].sort(compareByDisplayOrder).map(
      (childModule): AdminChildModuleSummary => ({
        id: toStringId(childModule.id),
        parentModuleId: toStringId(childModule.parentModuleId ?? module.id),
        label: childModule.label,
        displayOrder: childModule.displayOrder,
        icon: childModule.icon,
        href: childModule.href,
      })
    ),
    subModules: [...module.subModules].sort(compareByDisplayOrder).map(
      (subModule): AdminSubModuleSummary => ({
        id: toStringId(subModule.id),
        moduleId: toStringId(subModule.moduleId),
        label: subModule.label,
        displayOrder: subModule.displayOrder,
        icon: subModule.icon,
        href: subModule.href,
      })
    ),
  }
}

export function mapAdminModules(modules: AdminModuleWithSubModules[]): AdminModuleSummary[] {
  return [...modules].sort(compareByDisplayOrder).map(mapAdminModule)
}

export function mapRoleModuleMapping(
  roleId: number,
  mappings: RoleModuleMappingRow[]
): AdminRoleModuleMappingData {
  return {
    roleId: toStringId(roleId),
    moduleIds: uniqueSortedStringIds(
      mappings
        .filter((mapping) => mapping.subModuleId === null)
        .map((mapping) => mapping.moduleId)
    ),
    subModuleIds: uniqueSortedStringIds(
      mappings
        .filter((mapping): mapping is RoleModuleMappingRow & { subModuleId: number } => {
          return mapping.subModuleId !== null
        })
        .map((mapping) => mapping.subModuleId)
    ),
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

  return normalizedIds.sort((left, right) => left - right)
}
