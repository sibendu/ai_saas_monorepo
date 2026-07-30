import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAdminAuthorizationMock, roleCreateMock, roleFindFirstMock, roleFindManyMock, transactionMock, writeAdminAuditLogMock } =
  vi.hoisted(() => ({
    getAdminAuthorizationMock: vi.fn(),
    roleCreateMock: vi.fn(),
    roleFindFirstMock: vi.fn(),
    roleFindManyMock: vi.fn(),
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
      findMany: roleFindManyMock,
    },
  },
}))

import { GET, POST } from './route'

function authorizeAdmin() {
  getAdminAuthorizationMock.mockResolvedValue({
    isAuthorized: true,
    customer: {
      id: 1,
      email: 'admin@example.com',
      name: 'Admin User',
      company: null,
    },
  })
}

describe('admin roles API', () => {
  beforeEach(() => {
    getAdminAuthorizationMock.mockReset()
    roleCreateMock.mockReset()
    roleFindFirstMock.mockReset()
    roleFindManyMock.mockReset()
    transactionMock.mockReset()
    writeAdminAuditLogMock.mockReset()
    transactionMock.mockImplementation((callback) =>
      callback({
        role: {
          create: roleCreateMock,
        },
      })
    )
  })

  it('rejects non-admin callers before listing roles', async () => {
    getAdminAuthorizationMock.mockResolvedValue({
      isAuthorized: false,
      status: 403,
      error: 'Admin access required',
    })

    const response = await GET()

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Admin access required',
    })
    expect(response.status).toBe(403)
    expect(roleFindManyMock).not.toHaveBeenCalled()
  })

  it('returns roles sorted by name with counts', async () => {
    authorizeAdmin()
    roleFindManyMock.mockResolvedValue([
      {
        id: 1,
        name: 'Admin',
        description: 'Full access',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        _count: {
          users: 1,
          modules: 4,
        },
      },
    ])

    const response = await GET()

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        roles: [
          {
            id: '1',
            name: 'Admin',
            userCount: 1,
            moduleCount: 4,
          },
        ],
      },
    })
    expect(response.status).toBe(200)
  })

  it('rejects blank role names on create', async () => {
    authorizeAdmin()

    const response = await POST(
      new Request('http://localhost/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      })
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Role name is required',
    })
    expect(response.status).toBe(400)
    expect(roleCreateMock).not.toHaveBeenCalled()
    expect(writeAdminAuditLogMock).not.toHaveBeenCalled()
  })

  it('rejects duplicate role names on create', async () => {
    authorizeAdmin()
    roleFindFirstMock.mockResolvedValue({ id: 1, name: 'Admin' })

    const response = await POST(
      new Request('http://localhost/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ name: 'admin' }),
      })
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'A role with this name already exists',
    })
    expect(response.status).toBe(409)
    expect(roleCreateMock).not.toHaveBeenCalled()
    expect(writeAdminAuditLogMock).not.toHaveBeenCalled()
  })

  it('maps database unique conflicts on create to duplicate role errors', async () => {
    authorizeAdmin()
    roleFindFirstMock.mockResolvedValue(null)
    roleCreateMock.mockRejectedValue({ code: 'P2002' })

    const response = await POST(
      new Request('http://localhost/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ name: 'Support' }),
      })
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'A role with this name already exists',
    })
    expect(response.status).toBe(409)
  })

  it('rejects malformed create JSON with a client error', async () => {
    authorizeAdmin()

    const response = await POST(
      new Request('http://localhost/api/admin/roles', {
        method: 'POST',
        body: '{',
      })
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Invalid JSON request body',
    })
    expect(response.status).toBe(400)
    expect(roleFindFirstMock).not.toHaveBeenCalled()
    expect(roleCreateMock).not.toHaveBeenCalled()
  })

  it('writes an audit row when a role is created successfully', async () => {
    authorizeAdmin()
    roleFindFirstMock.mockResolvedValue(null)
    roleCreateMock.mockResolvedValue({
      id: 7,
      name: 'Support',
      description: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      _count: {
        users: 0,
        modules: 0,
      },
    })

    const response = await POST(
      new Request('http://localhost/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ name: 'Support' }),
      })
    )

    expect(response.status).toBe(201)
    expect(writeAdminAuditLogMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        action: 'ROLE_CREATED',
        entityType: 'ROLE',
        entityId: '7',
        targetRoleId: 7,
        metadata: { roleName: 'Support' },
      })
    )
  })
})
