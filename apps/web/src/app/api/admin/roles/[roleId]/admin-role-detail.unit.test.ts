import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getAdminAuthorizationMock,
  roleDeleteManyMock,
  roleFindFirstMock,
  roleFindUniqueMock,
  roleUpdateMock,
  transactionMock,
  writeAdminAuditLogMock,
} = vi.hoisted(() => ({
  getAdminAuthorizationMock: vi.fn(),
  roleDeleteManyMock: vi.fn(),
  roleFindFirstMock: vi.fn(),
  roleFindUniqueMock: vi.fn(),
  roleUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
  writeAdminAuditLogMock: vi.fn(),
}))

vi.mock('@/lib/admin-audit', () => ({
  writeAdminAuditLog: writeAdminAuditLogMock,
}))

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthorization: getAdminAuthorizationMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: transactionMock,
    role: {
      findFirst: roleFindFirstMock,
      findUnique: roleFindUniqueMock,
    },
  },
}))

import { DELETE, PUT } from './route'

describe('admin role detail API', () => {
  beforeEach(() => {
    getAdminAuthorizationMock.mockReset()
    roleDeleteManyMock.mockReset()
    roleFindFirstMock.mockReset()
    roleFindUniqueMock.mockReset()
    roleUpdateMock.mockReset()
    transactionMock.mockReset()
    writeAdminAuditLogMock.mockReset()
    transactionMock.mockImplementation((callback) =>
      callback({
        role: {
          deleteMany: roleDeleteManyMock,
          update: roleUpdateMock,
        },
      })
    )
    getAdminAuthorizationMock.mockResolvedValue({
      isAuthorized: true,
      customer: {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        company: null,
      },
    })
  })

  it('rejects renaming the canonical Admin role', async () => {
    roleFindUniqueMock.mockResolvedValue({
      id: 1,
      name: 'Admin',
      description: 'Full access',
    })

    const response = await PUT(
      new Request('http://localhost/api/admin/roles/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Owner', description: 'Full access' }),
      }),
      {
        params: Promise.resolve({ roleId: '1' }),
      }
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'The Admin role name cannot be changed',
    })
    expect(response.status).toBe(409)
    expect(roleUpdateMock).not.toHaveBeenCalled()
    expect(writeAdminAuditLogMock).not.toHaveBeenCalled()
  })

  it('returns 404 when a stale role update misses the database row', async () => {
    roleFindUniqueMock.mockResolvedValue({
      id: 2,
      name: 'Support',
      description: 'Support desk',
    })
    roleFindFirstMock.mockResolvedValue(null)
    roleUpdateMock.mockRejectedValue({ code: 'P2025' })

    const response = await PUT(
      new Request('http://localhost/api/admin/roles/2', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Support', description: 'Support desk' }),
      }),
      {
        params: Promise.resolve({ roleId: '2' }),
      }
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Role not found',
    })
    expect(response.status).toBe(404)
    expect(writeAdminAuditLogMock).not.toHaveBeenCalled()
  })

  it('rejects malformed update JSON with a client error', async () => {
    const response = await PUT(
      new Request('http://localhost/api/admin/roles/2', {
        method: 'PUT',
        body: '{',
      }),
      {
        params: Promise.resolve({ roleId: '2' }),
      }
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Invalid JSON request body',
    })
    expect(response.status).toBe(400)
    expect(roleFindUniqueMock).not.toHaveBeenCalled()
    expect(writeAdminAuditLogMock).not.toHaveBeenCalled()
  })

  it('rejects deleting roles with assigned users or module mappings', async () => {
    roleFindUniqueMock.mockResolvedValue({
      id: 1,
      name: 'Support',
      description: 'Support desk access',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      _count: {
        users: 1,
        modules: 3,
      },
    })

    const response = await DELETE(new Request('http://localhost/api/admin/roles/1'), {
      params: Promise.resolve({ roleId: '1' }),
    })

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Role cannot be deleted while it has assigned users or module access',
    })
    expect(response.status).toBe(409)
    expect(roleDeleteManyMock).not.toHaveBeenCalled()
    expect(writeAdminAuditLogMock).not.toHaveBeenCalled()
  })

  it('rejects deleting the canonical Admin role', async () => {
    roleFindUniqueMock.mockResolvedValue({
      id: 1,
      name: 'Admin',
      description: 'Full access',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      _count: {
        users: 0,
        modules: 0,
      },
    })

    const response = await DELETE(new Request('http://localhost/api/admin/roles/1'), {
      params: Promise.resolve({ roleId: '1' }),
    })

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'The Admin role cannot be deleted',
    })
    expect(response.status).toBe(409)
    expect(roleDeleteManyMock).not.toHaveBeenCalled()
    expect(writeAdminAuditLogMock).not.toHaveBeenCalled()
  })

  it('rejects delete when usage appears during the conditional delete', async () => {
    roleFindUniqueMock.mockResolvedValue({
      id: 2,
      name: 'Support',
      description: 'Support desk access',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      _count: {
        users: 0,
        modules: 0,
      },
    })
    roleDeleteManyMock.mockResolvedValue({ count: 0 })

    const response = await DELETE(new Request('http://localhost/api/admin/roles/2'), {
      params: Promise.resolve({ roleId: '2' }),
    })

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Role cannot be deleted while it has assigned users or module access',
    })
    expect(response.status).toBe(409)
    expect(writeAdminAuditLogMock).not.toHaveBeenCalled()
  })

  it('writes an audit row when a role is updated successfully', async () => {
    roleFindUniqueMock.mockResolvedValue({
      id: 2,
      name: 'Support',
      description: 'Support desk',
    })
    roleFindFirstMock.mockResolvedValue(null)
    roleUpdateMock.mockResolvedValue({
      id: 2,
      name: 'Support Lead',
      description: 'Support leadership',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      _count: {
        users: 0,
        modules: 0,
      },
    })

    const response = await PUT(
      new Request('http://localhost/api/admin/roles/2', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Support Lead', description: 'Support leadership' }),
      }),
      {
        params: Promise.resolve({ roleId: '2' }),
      }
    )

    expect(response.status).toBe(200)
    expect(writeAdminAuditLogMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        action: 'ROLE_UPDATED',
        entityType: 'ROLE',
        entityId: '2',
        targetRoleId: 2,
        metadata: { roleName: 'Support Lead', changedFields: ['name', 'description'] },
      })
    )
  })

  it('writes an audit row when a role is deleted successfully', async () => {
    roleFindUniqueMock.mockResolvedValue({
      id: 2,
      name: 'Support',
      description: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      _count: {
        users: 0,
        modules: 0,
      },
    })
    roleDeleteManyMock.mockResolvedValue({ count: 1 })

    const response = await DELETE(new Request('http://localhost/api/admin/roles/2'), {
      params: Promise.resolve({ roleId: '2' }),
    })

    expect(response.status).toBe(200)
    expect(writeAdminAuditLogMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        action: 'ROLE_DELETED',
        entityType: 'ROLE',
        entityId: '2',
        targetRoleId: 2,
        metadata: { roleName: 'Support' },
      })
    )
  })
})
