import type { AdminUserGroupSummary } from '@saas/shared-types'

export interface AdminUserGroupRow {
  id: number
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  roles?: {
    role: {
      id: number
      name: string
      description: string | null
    }
  }[]
  _count?: {
    members: number
  }
}

export function mapAdminUserGroup(group: AdminUserGroupRow): AdminUserGroupSummary {
  return {
    id: group.id.toString(),
    name: group.name,
    description: group.description,
    memberCount: group._count?.members ?? 0,
    roles:
      group.roles?.map((groupRole) => ({
        id: groupRole.role.id.toString(),
        name: groupRole.role.name,
        description: groupRole.role.description,
      })) ?? [],
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  }
}

export function normalizeUserGroupName(name: unknown): string {
  return typeof name === 'string' ? name.trim() : ''
}

export function normalizeUserGroupDescription(description: unknown): string | null {
  if (typeof description !== 'string') {
    return null
  }

  const trimmedDescription = description.trim()

  return trimmedDescription.length > 0 ? trimmedDescription : null
}

export function parseUserGroupId(groupId: string): number | null {
  const parsedGroupId = Number(groupId)

  return Number.isInteger(parsedGroupId) && parsedGroupId > 0 ? parsedGroupId : null
}

export function getPrismaErrorCode(error: unknown): string | null {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : null
}
