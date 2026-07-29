import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  customerFindUniqueMock,
  getAdminAuthorizationMock,
  roleFindFirstMock,
  roleFindManyMock,
  transactionMock,
  userRoleCountMock,
  userRoleCreateManyMock,
  userRoleDeleteManyMock,
} = vi.hoisted(() => ({
  customerFindUniqueMock: vi.fn(),
  getAdminAuthorizationMock: vi.fn(),
  roleFindFirstMock: vi.fn(),
  roleFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  userRoleCountMock: vi.fn(),
  userRoleCreateManyMock: vi.fn(),
  userRoleDeleteManyMock: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthorization: getAdminAuthorizationMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: transactionMock,
    customer: {
      findUnique: customerFindUniqueMock,
    },
    role: {
      findFirst: roleFindFirstMock,
      findMany: roleFindManyMock,
    },
    userRole: {
      count: userRoleCountMock,
    },
  },
}))

import { PUT } from './route'

const routeContext = {
  params: Promise.resolve({ userId: '2' }),
}

const targetUser = {
  id: 2,
  userRoles: [
    {
      roleId: 1,
    },
  ],
}

const updatedUser = {
  id: 2,
  email: 'jane@example.com',
  name: 'Jane User',
  company: null,
  userRoles: [
    {
      role: {
        id: 2,
        name: 'Support',
        description: null,
      },
    },
    {
      role: {
        id: 3,
        name: 'Billing',
        description: 'Billing access',
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
  return new Request('http://localhost/api/admin/users/2/roles', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

function arrangeSuccessfulLookups(roleIds = [2, 3]) {
  customerFindUniqueMock.mockResolvedValueOnce(targetUser)
  roleFindManyMock.mockResolvedValue(roleIds.map((id) => ({ id })))
  roleFindFirstMock.mockResolvedValue({ id: 1 })
  userRoleCountMock.mockResolvedValue(2)
  transactionMock.mockImplementation(async (callback) =>
    callback({
      userRole: {
        deleteMany: userRoleDeleteManyMock,
        createMany: userRoleCreateManyMock,
      },
    })
  )
  customerFindUniqueMock.mockResolvedValueOnce(updatedUser)
}

describe('admin user role assignment API', () => {
  beforeEach(() => {
    customerFindUniqueMock.mockReset()
    getAdminAuthorizationMock.mockReset()
    roleFindFirstMock.mockReset()
    roleFindManyMock.mockReset()
    transactionMock.mockReset()
    userRoleCountMock.mockReset()
    userRoleCreateManyMock.mockReset()
    userRoleDeleteManyMock.mockReset()
    authorizeAdmin()
  })

  it('rejects non-admin callers before querying role or user data', async () => {
    getAdminAuthorizationMock.mockResolvedValue({
      isAuthorized: false,
      status: 403,
      error: 'Admin access required',
    })

    const response = await PUT(putRequest({ roleIds: ['1'] }), routeContext)

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Admin access required',
    })
    expect(response.status).toBe(403)
    expect(customerFindUniqueMock).not.toHaveBeenCalled()
    expect(roleFindManyMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('rejects invalid user ids before reading role data', async () => {
    const response = await PUT(putRequest({ roleIds: ['1'] }), {
      params: Promise.resolve({ userId: 'abc' }),
    })

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Invalid user id',
    })
    expect(response.status).toBe(400)
    expect(customerFindUniqueMock).not.toHaveBeenCalled()
    expect(roleFindManyMock).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON and missing or non-array roleIds', async () => {
    const malformedResponse = await PUT(
      new Request('http://localhost/api/admin/users/2/roles', {
        method: 'PUT',
        body: '{',
      }),
      routeContext
    )
    await expect(malformedResponse.json()).resolves.toEqual({
      success: false,
      error: 'Invalid JSON request body',
    })
    expect(malformedResponse.status).toBe(400)

    const missingResponse = await PUT(putRequest({}), routeContext)
    await expect(missingResponse.json()).resolves.toEqual({
      success: false,
      error: 'roleIds must be an array',
    })
    expect(missingResponse.status).toBe(400)

    const nonArrayResponse = await PUT(putRequest({ roleIds: '1' }), routeContext)
    await expect(nonArrayResponse.json()).resolves.toEqual({
      success: false,
      error: 'roleIds must be an array',
    })
    expect(nonArrayResponse.status).toBe(400)
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('rejects non-positive, non-string, or duplicate role ids', async () => {
    const invalidResponse = await PUT(putRequest({ roleIds: ['1', '0'] }), routeContext)
    await expect(invalidResponse.json()).resolves.toEqual({
      success: false,
      error: 'Role ids must be unique positive integers',
    })
    expect(invalidResponse.status).toBe(400)

    const nonStringResponse = await PUT(putRequest({ roleIds: ['1', 2] }), routeContext)
    await expect(nonStringResponse.json()).resolves.toEqual({
      success: false,
      error: 'Role ids must be unique positive integers',
    })
    expect(nonStringResponse.status).toBe(400)

    const duplicateResponse = await PUT(putRequest({ roleIds: ['1', '1'] }), routeContext)
    await expect(duplicateResponse.json()).resolves.toEqual({
      success: false,
      error: 'Role ids must be unique positive integers',
    })
    expect(duplicateResponse.status).toBe(400)
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('rejects missing users and unknown roles without mutation', async () => {
    customerFindUniqueMock.mockResolvedValueOnce(null)

    const missingUserResponse = await PUT(putRequest({ roleIds: ['1'] }), routeContext)

    await expect(missingUserResponse.json()).resolves.toEqual({
      success: false,
      error: 'User not found',
    })
    expect(missingUserResponse.status).toBe(404)

    customerFindUniqueMock.mockResolvedValueOnce(targetUser)
    roleFindManyMock.mockResolvedValueOnce([{ id: 1 }])

    const unknownRoleResponse = await PUT(putRequest({ roleIds: ['1', '999'] }), routeContext)

    await expect(unknownRoleResponse.json()).resolves.toEqual({
      success: false,
      error: 'One or more roles were not found',
    })
    expect(unknownRoleResponse.status).toBe(400)
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('prevents removing Admin from the only remaining admin user', async () => {
    customerFindUniqueMock.mockResolvedValueOnce(targetUser)
    roleFindManyMock.mockResolvedValueOnce([{ id: 2 }])
    roleFindFirstMock.mockResolvedValueOnce({ id: 1 })
    userRoleCountMock.mockResolvedValueOnce(1)

    const response = await PUT(putRequest({ roleIds: ['2'] }), routeContext)

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'At least one admin user is required',
    })
    expect(response.status).toBe(409)
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('allows empty role assignments when another admin remains', async () => {
    arrangeSuccessfulLookups([])

    const response = await PUT(putRequest({ roleIds: [] }), routeContext)

    expect(response.status).toBe(200)
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(userRoleDeleteManyMock).toHaveBeenCalledWith({ where: { customerId: 2 } })
    expect(userRoleCreateManyMock).not.toHaveBeenCalled()
  })

  it('replaces assignments in a transaction and returns the mapped user summary', async () => {
    arrangeSuccessfulLookups([2, 3])

    const response = await PUT(putRequest({ roleIds: ['2', '3'] }), routeContext)

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        id: '2',
        email: 'jane@example.com',
        name: 'Jane User',
        company: null,
        roles: [
          {
            id: '2',
            name: 'Support',
            description: null,
          },
          {
            id: '3',
            name: 'Billing',
            description: 'Billing access',
          },
        ],
      },
      message: 'User roles updated successfully',
    })
    expect(response.status).toBe(200)
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(userRoleDeleteManyMock).toHaveBeenCalledWith({ where: { customerId: 2 } })
    expect(userRoleCreateManyMock).toHaveBeenCalledWith({
      data: [
        { customerId: 2, roleId: 2 },
        { customerId: 2, roleId: 3 },
      ],
    })
    expect(customerFindUniqueMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 2 },
      })
    )
  })
})
