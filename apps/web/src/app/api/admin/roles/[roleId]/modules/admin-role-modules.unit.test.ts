import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getAdminAuthorizationMock,
  moduleFindManyMock,
  roleFindUniqueMock,
  roleModuleFindManyMock,
  subModuleFindManyMock,
  transactionMock,
  txRoleModuleCreateManyMock,
  txRoleModuleDeleteManyMock,
  writeAdminAuditLogMock,
} = vi.hoisted(() => ({
  getAdminAuthorizationMock: vi.fn(),
  moduleFindManyMock: vi.fn(),
  roleFindUniqueMock: vi.fn(),
  roleModuleFindManyMock: vi.fn(),
  subModuleFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  txRoleModuleCreateManyMock: vi.fn(),
  txRoleModuleDeleteManyMock: vi.fn(),
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
    role: {
      findUnique: roleFindUniqueMock,
    },
    roleModule: {
      findMany: roleModuleFindManyMock,
    },
    module: {
      findMany: moduleFindManyMock,
    },
    subModule: {
      findMany: subModuleFindManyMock,
    },
    $transaction: transactionMock,
  },
}))

import { GET, PUT } from './route'

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

function getRequest(roleId = '2'): Request {
  return new Request(`http://localhost/api/admin/roles/${roleId}/modules`)
}

function putRequest(body: unknown, roleId = '2'): Request {
  return new Request(`http://localhost/api/admin/roles/${roleId}/modules`, {
    method: 'PUT',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function routeContext(roleId: string) {
  return {
    params: Promise.resolve({ roleId }),
  }
}

function expectNoMutation() {
  expect(transactionMock).not.toHaveBeenCalled()
  expect(txRoleModuleDeleteManyMock).not.toHaveBeenCalled()
  expect(txRoleModuleCreateManyMock).not.toHaveBeenCalled()
  expect(writeAdminAuditLogMock).not.toHaveBeenCalled()
}

describe('admin role module mapping API', () => {
  beforeEach(() => {
    getAdminAuthorizationMock.mockReset()
    moduleFindManyMock.mockReset()
    roleFindUniqueMock.mockReset()
    roleModuleFindManyMock.mockReset()
    subModuleFindManyMock.mockReset()
    transactionMock.mockReset()
    txRoleModuleCreateManyMock.mockReset()
    txRoleModuleDeleteManyMock.mockReset()
    writeAdminAuditLogMock.mockReset()
    authorizeAdmin()
    transactionMock.mockImplementation(async (callback) =>
      callback({
        roleModule: {
          createMany: txRoleModuleCreateManyMock,
          deleteMany: txRoleModuleDeleteManyMock,
        },
      })
    )
  })

  it('exports GET and PUT for role module mapping', () => {
    expect(GET).toEqual(expect.any(Function))
    expect(PUT).toEqual(expect.any(Function))
  })

  it('rejects non-admin callers before role or mapping queries', async () => {
    getAdminAuthorizationMock.mockResolvedValue({
      isAuthorized: false,
      status: 403,
      error: 'Admin access required',
    })

    const response = await GET(getRequest(), routeContext('2'))

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Admin access required',
    })
    expect(response.status).toBe(403)
    expect(roleFindUniqueMock).not.toHaveBeenCalled()
    expect(roleModuleFindManyMock).not.toHaveBeenCalled()
  })

  it.each(['abc', '0', '-1', '1.5', '01', '9007199254740992'])(
    'rejects invalid role id %s',
    async (roleId) => {
      const response = await GET(getRequest(roleId), routeContext(roleId))

      await expect(response.json()).resolves.toEqual({
        success: false,
        error: 'Invalid role id',
      })
      expect(response.status).toBe(400)
      expect(roleFindUniqueMock).not.toHaveBeenCalled()
      expect(roleModuleFindManyMock).not.toHaveBeenCalled()
    }
  )

  it('returns 404 for a stale role id', async () => {
    roleFindUniqueMock.mockResolvedValue(null)

    const response = await GET(getRequest(), routeContext('2'))

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Role not found',
    })
    expect(response.status).toBe(404)
    expect(roleFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 2 },
      select: { id: true },
    })
    expect(roleModuleFindManyMock).not.toHaveBeenCalled()
  })

  it('returns empty arrays when the role has no module mappings', async () => {
    roleFindUniqueMock.mockResolvedValue({ id: 2 })
    roleModuleFindManyMock.mockResolvedValue([])

    const response = await GET(getRequest(), routeContext('2'))

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        roleId: '2',
        moduleIds: [],
        subModuleIds: [],
      },
    })
    expect(response.status).toBe(200)
    expect(roleModuleFindManyMock).toHaveBeenCalledWith({
      where: { roleId: 2 },
      orderBy: [{ moduleId: 'asc' }, { subModuleId: 'asc' }],
      select: {
        moduleId: true,
        subModuleId: true,
      },
    })
  })

  it('returns normalized string arrays for populated mappings', async () => {
    roleFindUniqueMock.mockResolvedValue({ id: 7 })
    roleModuleFindManyMock.mockResolvedValue([
      { moduleId: 5, subModuleId: null },
      { moduleId: 3, subModuleId: 13 },
      { moduleId: 2, subModuleId: null },
      { moduleId: 5, subModuleId: null },
      { moduleId: 3, subModuleId: 12 },
      { moduleId: 3, subModuleId: 12 },
    ])

    const response = await GET(getRequest('7'), routeContext('7'))

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        roleId: '7',
        moduleIds: ['2', '5'],
        subModuleIds: ['12', '13'],
      },
    })
    expect(response.status).toBe(200)
  })

  it('returns a safe 500 response when mapping loading fails unexpectedly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    roleFindUniqueMock.mockResolvedValue({ id: 2 })
    roleModuleFindManyMock.mockRejectedValue(new Error('database unavailable'))

    const response = await GET(getRequest(), routeContext('2'))

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Failed to fetch role module access',
    })
    expect(response.status).toBe(500)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Admin role module access fetch error:',
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
  })

  it('rejects non-admin PUT callers before role or mapping queries', async () => {
    getAdminAuthorizationMock.mockResolvedValue({
      isAuthorized: false,
      status: 403,
      error: 'Admin access required',
    })

    const response = await PUT(
      putRequest({ moduleIds: ['1'], subModuleIds: [] }),
      routeContext('2')
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Admin access required',
    })
    expect(response.status).toBe(403)
    expect(roleFindUniqueMock).not.toHaveBeenCalled()
    expect(moduleFindManyMock).not.toHaveBeenCalled()
    expect(subModuleFindManyMock).not.toHaveBeenCalled()
    expectNoMutation()
  })

  it.each(['abc', '0', '-1', '1.5', '01', '9007199254740992'])(
    'rejects invalid PUT role id %s',
    async (roleId) => {
      const response = await PUT(
        putRequest({ moduleIds: [], subModuleIds: [] }, roleId),
        routeContext(roleId)
      )

      await expect(response.json()).resolves.toEqual({
        success: false,
        error: 'Invalid role id',
      })
      expect(response.status).toBe(400)
      expect(roleFindUniqueMock).not.toHaveBeenCalled()
      expectNoMutation()
    }
  )

  it('rejects malformed JSON request bodies before database reads', async () => {
    const response = await PUT(putRequest('{', '2'), routeContext('2'))

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Invalid JSON request body',
    })
    expect(response.status).toBe(400)
    expect(roleFindUniqueMock).not.toHaveBeenCalled()
    expectNoMutation()
  })

  it.each([
    [{ subModuleIds: [] }, 'moduleIds must be an array'],
    [{ moduleIds: '1', subModuleIds: [] }, 'moduleIds must be an array'],
    [{ moduleIds: [] }, 'subModuleIds must be an array'],
    [{ moduleIds: [], subModuleIds: '1' }, 'subModuleIds must be an array'],
  ])('rejects missing or non-array fields %#', async (body, expectedError) => {
    const response = await PUT(putRequest(body), routeContext('2'))

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: expectedError,
    })
    expect(response.status).toBe(400)
    expect(roleFindUniqueMock).not.toHaveBeenCalled()
    expectNoMutation()
  })

  it.each([
    [{ moduleIds: ['1', '1'], subModuleIds: [] }, 'Module ids must be unique positive integers'],
    [{ moduleIds: ['0'], subModuleIds: [] }, 'Module ids must be unique positive integers'],
    [{ moduleIds: ['1.5'], subModuleIds: [] }, 'Module ids must be unique positive integers'],
    [{ moduleIds: ['01'], subModuleIds: [] }, 'Module ids must be unique positive integers'],
    [
      { moduleIds: ['9007199254740992'], subModuleIds: [] },
      'Module ids must be unique positive integers',
    ],
    [{ moduleIds: [1], subModuleIds: [] }, 'Module ids must be unique positive integers'],
    [{ moduleIds: ['1'], subModuleIds: ['2', '2'] }, 'Sub-module ids must be unique positive integers'],
    [{ moduleIds: ['1'], subModuleIds: ['-2'] }, 'Sub-module ids must be unique positive integers'],
    [{ moduleIds: ['1'], subModuleIds: ['2.5'] }, 'Sub-module ids must be unique positive integers'],
    [{ moduleIds: ['1'], subModuleIds: ['02'] }, 'Sub-module ids must be unique positive integers'],
    [
      { moduleIds: ['1'], subModuleIds: ['9007199254740992'] },
      'Sub-module ids must be unique positive integers',
    ],
    [{ moduleIds: ['1'], subModuleIds: [2] }, 'Sub-module ids must be unique positive integers'],
  ])('rejects invalid or duplicate mapping ids %#', async (body, expectedError) => {
    const response = await PUT(putRequest(body), routeContext('2'))

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: expectedError,
    })
    expect(response.status).toBe(400)
    expect(roleFindUniqueMock).not.toHaveBeenCalled()
    expectNoMutation()
  })

  it('returns 404 for a stale role id before mutation', async () => {
    roleFindUniqueMock.mockResolvedValue(null)

    const response = await PUT(
      putRequest({ moduleIds: ['1'], subModuleIds: [] }),
      routeContext('2')
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Role not found',
    })
    expect(response.status).toBe(404)
    expect(roleFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 2 },
      select: { id: true, name: true },
    })
    expect(moduleFindManyMock).not.toHaveBeenCalled()
    expectNoMutation()
  })

  it('rejects unknown module ids before mutation', async () => {
    roleFindUniqueMock.mockResolvedValue({ id: 2, name: 'Sales' })
    moduleFindManyMock.mockResolvedValue([{ id: 1 }])

    const response = await PUT(
      putRequest({ moduleIds: ['1', '3'], subModuleIds: [] }),
      routeContext('2')
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'One or more modules were not found',
    })
    expect(response.status).toBe(400)
    expect(moduleFindManyMock).toHaveBeenCalledWith({
      where: { id: { in: [1, 3] } },
      select: { id: true },
    })
    expect(subModuleFindManyMock).not.toHaveBeenCalled()
    expectNoMutation()
  })

  it('rejects unknown sub-module ids before mutation', async () => {
    roleFindUniqueMock.mockResolvedValue({ id: 2, name: 'Sales' })
    moduleFindManyMock.mockResolvedValue([{ id: 1 }])
    subModuleFindManyMock.mockResolvedValue([{ id: 10, moduleId: 1 }])

    const response = await PUT(
      putRequest({ moduleIds: ['1'], subModuleIds: ['10', '11'] }),
      routeContext('2')
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'One or more sub-modules were not found',
    })
    expect(response.status).toBe(400)
    expect(subModuleFindManyMock).toHaveBeenCalledWith({
      where: { id: { in: [10, 11] } },
      select: { id: true, moduleId: true },
    })
    expectNoMutation()
  })

  it('rejects sub-modules that do not belong to a selected module before mutation', async () => {
    roleFindUniqueMock.mockResolvedValue({ id: 2, name: 'Sales' })
    moduleFindManyMock.mockResolvedValue([{ id: 1 }])
    subModuleFindManyMock.mockResolvedValue([{ id: 10, moduleId: 3 }])

    const response = await PUT(
      putRequest({ moduleIds: ['1'], subModuleIds: ['10'] }),
      routeContext('2')
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Sub-module does not belong to a selected module',
    })
    expect(response.status).toBe(400)
    expectNoMutation()
  })

  it('rejects empty access for the canonical Admin role without mutation', async () => {
    roleFindUniqueMock.mockResolvedValue({ id: 1, name: 'Admin' })

    const response = await PUT(
      putRequest({ moduleIds: [], subModuleIds: [] }, '1'),
      routeContext('1')
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Admin role must retain module access',
    })
    expect(response.status).toBe(409)
    expect(moduleFindManyMock).not.toHaveBeenCalled()
    expect(subModuleFindManyMock).not.toHaveBeenCalled()
    expectNoMutation()
  })

  it('allows empty access for non-Admin roles and deletes existing mappings', async () => {
    roleFindUniqueMock.mockResolvedValue({ id: 2, name: 'Sales' })

    const response = await PUT(
      putRequest({ moduleIds: [], subModuleIds: [] }),
      routeContext('2')
    )

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        roleId: '2',
        moduleIds: [],
        subModuleIds: [],
      },
      message: 'Role module access updated successfully',
    })
    expect(response.status).toBe(200)
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(txRoleModuleDeleteManyMock).toHaveBeenCalledWith({ where: { roleId: 2 } })
    expect(txRoleModuleCreateManyMock).not.toHaveBeenCalled()
    expect(writeAdminAuditLogMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        action: 'ROLE_MODULES_UPDATED',
        entityType: 'ROLE_MODULE',
        entityId: '2',
        entityLabel: 'Sales',
        targetRoleId: 2,
        metadata: { moduleIds: [], subModuleIds: [] },
      })
    )
  })

  it('replaces mappings transactionally for top-level module access only', async () => {
    roleFindUniqueMock.mockResolvedValue({ id: 2, name: 'Sales' })
    moduleFindManyMock.mockResolvedValue([{ id: 3 }, { id: 1 }])

    const response = await PUT(
      putRequest({ moduleIds: ['3', '1'], subModuleIds: [] }),
      routeContext('2')
    )

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        roleId: '2',
        moduleIds: ['1', '3'],
        subModuleIds: [],
      },
      message: 'Role module access updated successfully',
    })
    expect(response.status).toBe(200)
    expect(subModuleFindManyMock).not.toHaveBeenCalled()
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(txRoleModuleDeleteManyMock).toHaveBeenCalledWith({ where: { roleId: 2 } })
    expect(txRoleModuleCreateManyMock).toHaveBeenCalledWith({
      data: [
        { roleId: 2, moduleId: 1, subModuleId: null },
        { roleId: 2, moduleId: 3, subModuleId: null },
      ],
    })
    expect(writeAdminAuditLogMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        action: 'ROLE_MODULES_UPDATED',
        metadata: { moduleIds: ['1', '3'], subModuleIds: [] },
      })
    )
  })

  it('replaces mappings transactionally for mixed module and sub-module access', async () => {
    roleFindUniqueMock.mockResolvedValue({ id: 2, name: 'Sales' })
    moduleFindManyMock.mockResolvedValue([{ id: 3 }, { id: 1 }])
    subModuleFindManyMock.mockResolvedValue([
      { id: 12, moduleId: 3 },
      { id: 10, moduleId: 1 },
    ])

    const response = await PUT(
      putRequest({ moduleIds: ['3', '1'], subModuleIds: ['12', '10'] }),
      routeContext('2')
    )

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        roleId: '2',
        moduleIds: ['1', '3'],
        subModuleIds: ['10', '12'],
      },
      message: 'Role module access updated successfully',
    })
    expect(response.status).toBe(200)
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(txRoleModuleDeleteManyMock).toHaveBeenCalledWith({ where: { roleId: 2 } })
    expect(txRoleModuleCreateManyMock).toHaveBeenCalledWith({
      data: [
        { roleId: 2, moduleId: 1, subModuleId: null },
        { roleId: 2, moduleId: 3, subModuleId: null },
        { roleId: 2, moduleId: 1, subModuleId: 10 },
        { roleId: 2, moduleId: 3, subModuleId: 12 },
      ],
    })
    expect(writeAdminAuditLogMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        action: 'ROLE_MODULES_UPDATED',
        metadata: { moduleIds: ['1', '3'], subModuleIds: ['10', '12'] },
      })
    )
  })

  it('returns a safe 500 response when the update fails unexpectedly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    roleFindUniqueMock.mockResolvedValue({ id: 2, name: 'Sales' })
    moduleFindManyMock.mockResolvedValue([{ id: 1 }])
    transactionMock.mockRejectedValue(new Error('database unavailable'))

    const response = await PUT(
      putRequest({ moduleIds: ['1'], subModuleIds: [] }),
      routeContext('2')
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Failed to update role module access',
    })
    expect(response.status).toBe(500)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Admin role module access update error:',
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
  })
})
