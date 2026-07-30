import { describe, expect, it, vi } from 'vitest'
import { mapAuditLog, writeAdminAuditLog } from '@/lib/admin-audit'

const actor = {
  customer: {
    id: 1,
    email: ' Admin@Example.COM ',
  },
}

describe('admin-audit', () => {
  it('writes normalized actor fields and allowlisted metadata only', async () => {
    const auditCreateMock = vi.fn().mockResolvedValue({ id: 1 })

    await writeAdminAuditLog(
      {
        auditLog: {
          create: auditCreateMock,
        },
      } as never,
      {
        actor,
        action: 'USER_UPDATED',
        entityType: 'CUSTOMER',
        entityId: '2',
        targetCustomerId: 2,
        metadata: {
          changedFields: ['email', 'name'],
          password: 'secret',
          rawRequestBody: { email: 'jane@example.com' },
        },
      }
    )

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorCustomerId: 1,
        actorEmail: 'admin@example.com',
        action: 'USER_UPDATED',
        entityType: 'CUSTOMER',
        entityId: '2',
        targetCustomerId: 2,
        metadata: {
          changedFields: ['email', 'name'],
        },
      }),
    })
  })

  it('maps audit log rows to string ids and ISO timestamps', () => {
    expect(
      mapAuditLog({
        id: 12,
        actorCustomerId: 1,
        actorEmail: 'admin@example.com',
        action: 'ROLE_MODULES_UPDATED',
        entityType: 'ROLE_MODULE',
        entityId: '3',
        entityLabel: 'Support',
        targetCustomerId: null,
        targetRoleId: 3,
        metadata: {
          moduleIds: ['1'],
          subModuleIds: [],
        },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      })
    ).toEqual({
      id: '12',
      actorCustomerId: '1',
      actorEmail: 'admin@example.com',
      action: 'ROLE_MODULES_UPDATED',
      entityType: 'ROLE_MODULE',
      entityId: '3',
      entityLabel: 'Support',
      targetCustomerId: null,
      targetRoleId: '3',
      metadata: {
        moduleIds: ['1'],
        subModuleIds: [],
      },
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })
})
