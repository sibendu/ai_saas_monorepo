import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAdminAuthorizationMock, userGroupCreateMock, userGroupFindFirstMock, userGroupFindManyMock } =
  vi.hoisted(() => ({
    getAdminAuthorizationMock: vi.fn(),
    userGroupCreateMock: vi.fn(),
    userGroupFindFirstMock: vi.fn(),
    userGroupFindManyMock: vi.fn(),
  }))

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthorization: getAdminAuthorizationMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userGroup: {
      create: userGroupCreateMock,
      findFirst: userGroupFindFirstMock,
      findMany: userGroupFindManyMock,
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

describe('admin user groups API', () => {
  beforeEach(() => {
    getAdminAuthorizationMock.mockReset()
    userGroupCreateMock.mockReset()
    userGroupFindFirstMock.mockReset()
    userGroupFindManyMock.mockReset()
  })

  it('rejects non-admin callers before listing user groups', async () => {
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
    expect(userGroupFindManyMock).not.toHaveBeenCalled()
  })

  it('returns user groups sorted by name', async () => {
    authorizeAdmin()
    userGroupFindManyMock.mockResolvedValue([
      {
        id: 1,
        name: 'Support Team',
        description: 'Support users',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      _count: {
        members: 3,
      },
      roles: [],
      },
    ])

    const response = await GET()

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        userGroups: [
          {
            id: '1',
            name: 'Support Team',
            description: 'Support users',
            memberCount: 3,
          },
        ],
      },
    })
    expect(response.status).toBe(200)
    expect(userGroupFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { name: 'asc' },
      include: expect.objectContaining({
        _count: {
          select: {
            members: true,
          },
        },
      }),
    }))
  })

  it('rejects blank user group names on create', async () => {
    authorizeAdmin()

    const response = await POST(
      new Request('http://localhost/api/admin/user-groups', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      })
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'User group name is required',
    })
    expect(response.status).toBe(400)
    expect(userGroupCreateMock).not.toHaveBeenCalled()
  })

  it('rejects duplicate user group names on create', async () => {
    authorizeAdmin()
    userGroupFindFirstMock.mockResolvedValue({ id: 1, name: 'Support Team' })

    const response = await POST(
      new Request('http://localhost/api/admin/user-groups', {
        method: 'POST',
        body: JSON.stringify({ name: 'support team' }),
      })
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'A user group with this name already exists',
    })
    expect(response.status).toBe(409)
    expect(userGroupCreateMock).not.toHaveBeenCalled()
  })

  it('creates user groups with normalized values', async () => {
    authorizeAdmin()
    userGroupFindFirstMock.mockResolvedValue(null)
    userGroupCreateMock.mockResolvedValue({
      id: 7,
      name: 'Support Team',
      description: 'Support users',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      roles: [],
      _count: {
        members: 0,
      },
    })

    const response = await POST(
      new Request('http://localhost/api/admin/user-groups', {
        method: 'POST',
        body: JSON.stringify({ name: ' Support Team ', description: ' Support users ' }),
      })
    )

    expect(response.status).toBe(201)
    expect(userGroupCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        name: 'Support Team',
        description: 'Support users',
      },
    }))
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        id: '7',
        name: 'Support Team',
      },
      message: 'User group created successfully',
    })
  })
})
