import { beforeEach, describe, expect, it, vi } from 'vitest'

const { customerFindManyMock, getAdminAuthorizationMock } = vi.hoisted(() => ({
  customerFindManyMock: vi.fn(),
  getAdminAuthorizationMock: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthorization: getAdminAuthorizationMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: customerFindManyMock,
    },
  },
}))

import { GET } from './route'

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

describe('admin users API', () => {
  beforeEach(() => {
    customerFindManyMock.mockReset()
    getAdminAuthorizationMock.mockReset()
  })

  it('rejects non-admin callers before listing users', async () => {
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
    expect(customerFindManyMock).not.toHaveBeenCalled()
  })

  it('returns users with read-only role summaries and omits sensitive fields', async () => {
    authorizeAdmin()
    customerFindManyMock.mockResolvedValue([
      {
        id: 2,
        email: 'jane@example.com',
        name: 'Jane Admin',
        company: 'Acme',
        userRoles: [
          {
            role: {
              id: 1,
              name: 'Admin',
              description: 'Full access',
            },
          },
        ],
      },
    ])

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        users: [
          {
            id: '2',
            email: 'jane@example.com',
            name: 'Jane Admin',
            company: 'Acme',
            roles: [
              {
                id: '1',
                name: 'Admin',
                description: 'Full access',
              },
            ],
          },
        ],
      },
    })
    expect(JSON.stringify(payload)).not.toContain('password')
    expect(JSON.stringify(payload)).not.toContain('passwordResetToken')
    expect(customerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { email: 'asc' },
        select: expect.not.objectContaining({
          password: expect.anything(),
          passwordResetToken: expect.anything(),
          passwordResetExpiresAt: expect.anything(),
        }),
      })
    )
  })
})
