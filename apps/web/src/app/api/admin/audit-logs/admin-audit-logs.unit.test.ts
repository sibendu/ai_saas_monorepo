import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auditLogCountMock, auditLogFindManyMock, getAdminAuthorizationMock } = vi.hoisted(() => ({
  auditLogCountMock: vi.fn(),
  auditLogFindManyMock: vi.fn(),
  getAdminAuthorizationMock: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthorization: getAdminAuthorizationMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      count: auditLogCountMock,
      findMany: auditLogFindManyMock,
    },
  },
}))

import * as auditLogsRoute from './route'

const { GET } = auditLogsRoute

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

function auditRequest(query = ''): Request {
  return new Request(`http://localhost/api/admin/audit-logs${query}`)
}

const auditRows = [
  {
    id: 5,
    actorCustomerId: 1,
    actorEmail: 'admin@example.com',
    action: 'ROLE_UPDATED',
    entityType: 'ROLE',
    entityId: '2',
    entityLabel: 'Support',
    targetCustomerId: null,
    targetRoleId: 2,
    metadata: { changedFields: ['name'] },
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
  },
  {
    id: 4,
    actorCustomerId: 1,
    actorEmail: 'admin@example.com',
    action: 'USER_UPDATED',
    entityType: 'CUSTOMER',
    entityId: '3',
    entityLabel: 'Jane User',
    targetCustomerId: 3,
    targetRoleId: null,
    metadata: { changedFields: ['company'] },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
]

describe('admin audit logs API', () => {
  beforeEach(() => {
    auditLogCountMock.mockReset()
    auditLogFindManyMock.mockReset()
    getAdminAuthorizationMock.mockReset()
    authorizeAdmin()
  })

  it('does not expose mutation methods', () => {
    expect('POST' in auditLogsRoute).toBe(false)
  })

  it('rejects non-admin callers before querying audit rows', async () => {
    getAdminAuthorizationMock.mockResolvedValue({
      isAuthorized: false,
      status: 403,
      error: 'Admin access required',
    })

    const response = await GET(auditRequest())

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Admin access required',
    })
    expect(response.status).toBe(403)
    expect(auditLogFindManyMock).not.toHaveBeenCalled()
  })

  it('returns newest-first logs with filters and pagination cursor', async () => {
    auditLogFindManyMock.mockResolvedValue([...auditRows, { ...auditRows[1], id: 3 }])
    auditLogCountMock.mockResolvedValue(3)

    const response = await GET(
      auditRequest(
        '?action=ROLE_UPDATED&entityType=ROLE&actorEmail=Admin@Example.com&targetRoleId=2&from=2026-01-01T00:00:00.000Z&to=2026-01-03T00:00:00.000Z&limit=2'
      )
    )

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        logs: [
          expect.objectContaining({
            id: '5',
            action: 'ROLE_UPDATED',
            actorEmail: 'admin@example.com',
          }),
          expect.objectContaining({
            id: '4',
            action: 'USER_UPDATED',
          }),
        ],
        nextCursor: '4',
        totalCount: 3,
      },
    })
    expect(response.status).toBe(200)
    expect(auditLogFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 3,
        where: expect.objectContaining({
          action: 'ROLE_UPDATED',
          entityType: 'ROLE',
          actorEmail: 'admin@example.com',
          targetRoleId: 2,
        }),
      })
    )
  })

  it.each([
    ['?action=NOPE', 'Invalid action filter'],
    ['?entityType=NOPE', 'Invalid entity type filter'],
    ['?actorEmail=not-email', 'Invalid actor email filter'],
    ['?targetCustomerId=01', 'Invalid target customer id'],
    ['?targetRoleId=0', 'Invalid target role id'],
    ['?cursor=1.5', 'Invalid cursor'],
    ['?from=not-date', 'Invalid date range'],
    ['?from=2026-01-03T00:00:00.000Z&to=2026-01-01T00:00:00.000Z', 'Invalid date range'],
    ['?limit=101', 'limit must be between 1 and 100'],
  ])('validates bad query %s', async (query, error) => {
    const response = await GET(auditRequest(query))

    await expect(response.json()).resolves.toEqual({
      success: false,
      error,
    })
    expect(response.status).toBe(400)
    expect(auditLogFindManyMock).not.toHaveBeenCalled()
  })
})
