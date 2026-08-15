import type { Prisma } from '@prisma/client'
import type {
  AdminAuditAction,
  AdminAuditEntityType,
  AdminAuditLogSummary,
} from '@saas/shared-types'

interface AuditActor {
  customer: {
    id: number
    email: string
  }
}

type AuditMetadata = Record<string, unknown>

export const adminAuditActions = [
  'ROLE_CREATED',
  'ROLE_UPDATED',
  'ROLE_DELETED',
  'USER_UPDATED',
  'USER_ROLES_UPDATED',
  'ROLE_MODULES_UPDATED',
] as const satisfies readonly AdminAuditAction[]

export const adminAuditEntityTypes = [
  'ROLE',
  'CUSTOMER',
  'USER_ROLE',
  'ROLE_MODULE',
] as const satisfies readonly AdminAuditEntityType[]

export interface WriteAdminAuditLogInput {
  actor: AuditActor
  action: AdminAuditAction
  entityType: AdminAuditEntityType
  entityId?: string | null
  entityLabel?: string | null
  targetCustomerId?: number | null
  targetRoleId?: number | null
  metadata?: AuditMetadata | null
}

type AuditLogWriter = Pick<Prisma.TransactionClient, 'auditLog'>

interface AuditLogRow {
  id: number
  actorCustomerId: number | null
  actorEmail: string
  action: string
  entityType: string
  entityId: string | null
  entityLabel: string | null
  targetCustomerId: number | null
  targetRoleId: number | null
  metadata: Prisma.JsonValue | string | null
  createdAt: Date
}

function cleanStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const safeValues = value.filter((item): item is string => typeof item === 'string')

  return safeValues.length === value.length ? safeValues : null
}

function cleanIdArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const safeValues = value.filter(
    (item): item is string => typeof item === 'string' && /^[1-9]\d*$/.test(item)
  )

  return safeValues.length === value.length ? safeValues : null
}

function sanitizeMetadata(action: AdminAuditAction, metadata: AuditMetadata | null | undefined) {
  if (!metadata) {
    return undefined
  }

  if (action === 'ROLE_CREATED' || action === 'ROLE_DELETED') {
    return typeof metadata.roleName === 'string' ? { roleName: metadata.roleName } : undefined
  }

  if (action === 'ROLE_UPDATED') {
    const changedFields = cleanStringArray(metadata.changedFields)

    return {
      ...(typeof metadata.roleName === 'string' ? { roleName: metadata.roleName } : {}),
      ...(changedFields ? { changedFields } : {}),
    }
  }

  if (action === 'USER_UPDATED') {
    const changedFields = cleanStringArray(metadata.changedFields)

    return changedFields ? { changedFields } : undefined
  }

  if (action === 'USER_ROLES_UPDATED') {
    const roleIds = cleanIdArray(metadata.roleIds)

    return roleIds ? { roleIds } : undefined
  }

  const moduleIds = cleanIdArray(metadata.moduleIds)
  const subModuleIds = cleanIdArray(metadata.subModuleIds)

  return {
    ...(moduleIds ? { moduleIds } : {}),
    ...(subModuleIds ? { subModuleIds } : {}),
  }
}

function toStringId(id: number | null): string | null {
  return id === null ? null : id.toString()
}

function isSqliteProvider(): boolean {
  return process.env.DB_PROVIDER === 'sqlite' || process.env.DATABASE_URL?.startsWith('file:') === true
}

function serializeMetadata(metadata: ReturnType<typeof sanitizeMetadata>) {
  if (!metadata) {
    return undefined
  }

  return isSqliteProvider() ? JSON.stringify(metadata) : metadata
}

function parseMetadata(metadata: AuditLogRow['metadata']): Record<string, unknown> | null {
  if (typeof metadata === 'string') {
    try {
      const parsedMetadata = JSON.parse(metadata)

      return typeof parsedMetadata === 'object' && parsedMetadata !== null && !Array.isArray(parsedMetadata)
        ? parsedMetadata as Record<string, unknown>
        : null
    } catch {
      return null
    }
  }

  return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : null
}

export async function writeAdminAuditLog(
  prismaClient: AuditLogWriter,
  input: WriteAdminAuditLogInput
) {
  const metadata = sanitizeMetadata(input.action, input.metadata)

  return prismaClient.auditLog.create({
    data: {
      actorCustomerId: input.actor.customer.id,
      actorEmail: input.actor.customer.email.toLowerCase().trim(),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel ?? null,
      targetCustomerId: input.targetCustomerId ?? null,
      targetRoleId: input.targetRoleId ?? null,
      metadata: serializeMetadata(metadata) as never,
    },
  })
}

export function mapAuditLog(log: AuditLogRow): AdminAuditLogSummary {
  return {
    id: log.id.toString(),
    actorCustomerId: toStringId(log.actorCustomerId),
    actorEmail: log.actorEmail,
    action: log.action as AdminAuditAction,
    entityType: log.entityType as AdminAuditEntityType,
    entityId: log.entityId,
    entityLabel: log.entityLabel,
    targetCustomerId: toStringId(log.targetCustomerId),
    targetRoleId: toStringId(log.targetRoleId),
    metadata: parseMetadata(log.metadata),
    createdAt: log.createdAt.toISOString(),
  }
}
