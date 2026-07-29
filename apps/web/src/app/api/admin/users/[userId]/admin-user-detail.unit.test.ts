import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  customerFindFirstMock,
  customerFindUniqueMock,
  customerUpdateMock,
  getAdminAuthorizationMock,
} = vi.hoisted(() => ({
  customerFindFirstMock: vi.fn(),
  customerFindUniqueMock: vi.fn(),
  customerUpdateMock: vi.fn(),
  getAdminAuthorizationMock: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthorization: getAdminAuthorizationMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findFirst: customerFindFirstMock,
      findUnique: customerFindUniqueMock,
      update: customerUpdateMock,
    },
  },
}))

import { PUT } from './route'

const routeContext = {
  params: Promise.resolve({ userId: '2' }),
}

const updatedUser = {
  id: 2,
  email: 'jane@example.com',
  name: 'Jane User',
  company: null,
  userRoles: [
    {
      role: {
        id: 3,
        name: 'Support',
        description: null,
      },
    },
  ],
}

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

function putRequest(body: unknown): Request {
  return new Request('http://localhost/api/admin/users/2', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

describe('admin user detail API', () => {
  beforeEach(() => {
    customerFindFirstMock.mockReset()
    customerFindUniqueMock.mockReset()
    customerUpdateMock.mockReset()
    getAdminAuthorizationMock.mockReset()
    authorizeAdmin()
  })

  it('rejects non-admin callers before updating users', async () => {
    getAdminAuthorizationMock.mockResolvedValue({
      isAuthorized: false,
      status: 403,
      error: 'Admin access required',
    })

    const response = await PUT(putRequest({ name: 'Jane', email: 'jane@example.com' }), routeContext)

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Admin access required',
    })
    expect(response.status).toBe(403)
    expect(customerUpdateMock).not.toHaveBeenCalled()
  })

  it('rejects invalid user ids before reading the body', async () => {
    const response = await PUT(putRequest({ name: 'Jane', email: 'jane@example.com' }), {
      params: Promise.resolve({ userId: 'abc' }),
    })

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Invalid user id',
    })
    expect(response.status).toBe(400)
    expect(customerFindUniqueMock).not.toHaveBeenCalled()
    expect(customerUpdateMock).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON with a client error', async () => {
    const response = await PUT(
      new Request('http://localhost/api/admin/users/2', {
        method: 'PUT',
        body: '{',
      }),
      routeContext
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Invalid JSON request body',
    })
    expect(response.status).toBe(400)
    expect(customerFindUniqueMock).not.toHaveBeenCalled()
  })

  it('rejects blank required fields and invalid emails', async () => {
    const blankNameResponse = await PUT(putRequest({ name: ' ', email: 'jane@example.com' }), routeContext)
    await expect(blankNameResponse.json()).resolves.toEqual({
      success: false,
      error: 'Name is required',
    })
    expect(blankNameResponse.status).toBe(400)

    const blankEmailResponse = await PUT(putRequest({ name: 'Jane', email: ' ' }), routeContext)
    await expect(blankEmailResponse.json()).resolves.toEqual({
      success: false,
      error: 'Email is required',
    })
    expect(blankEmailResponse.status).toBe(400)

    const invalidEmailResponse = await PUT(putRequest({ name: 'Jane', email: 'not-email' }), routeContext)
    await expect(invalidEmailResponse.json()).resolves.toEqual({
      success: false,
      error: 'Email format is invalid',
    })
    expect(invalidEmailResponse.status).toBe(400)
    expect(customerUpdateMock).not.toHaveBeenCalled()
  })

  it('returns a conflict when the email belongs to another user', async () => {
    customerFindUniqueMock.mockResolvedValue({ id: 2 })
    customerFindFirstMock.mockResolvedValue({ id: 3, email: 'jane@example.com' })

    const response = await PUT(putRequest({ name: 'Jane', email: 'jane@example.com' }), routeContext)

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'A user with this email already exists',
    })
    expect(response.status).toBe(409)
    expect(customerUpdateMock).not.toHaveBeenCalled()
  })

  it('returns not found when the target user is missing', async () => {
    customerFindUniqueMock.mockResolvedValue(null)

    const response = await PUT(putRequest({ name: 'Jane', email: 'jane@example.com' }), routeContext)

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'User not found',
    })
    expect(response.status).toBe(404)
    expect(customerUpdateMock).not.toHaveBeenCalled()
  })

  it('updates editable fields only and returns the updated user with roles', async () => {
    customerFindUniqueMock.mockResolvedValue({ id: 2 })
    customerFindFirstMock.mockResolvedValue(null)
    customerUpdateMock.mockResolvedValue(updatedUser)

    const response = await PUT(
      putRequest({
        name: ' Jane User ',
        email: ' JANE@example.com ',
        company: '   ',
      }),
      routeContext
    )

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        id: '2',
        email: 'jane@example.com',
        name: 'Jane User',
        company: null,
        roles: [
          {
            id: '3',
            name: 'Support',
            description: null,
          },
        ],
      },
      message: 'User updated successfully',
    })
    expect(response.status).toBe(200)
    expect(customerUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: {
          email: 'jane@example.com',
          name: 'Jane User',
          company: null,
        },
      })
    )
  })
})
