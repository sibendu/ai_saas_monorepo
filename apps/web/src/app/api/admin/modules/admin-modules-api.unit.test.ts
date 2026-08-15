import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAdminAuthorizationMock, moduleCreateMock, moduleFindFirstMock, moduleFindManyMock } = vi.hoisted(() => ({
  getAdminAuthorizationMock: vi.fn(),
  moduleCreateMock: vi.fn(),
  moduleFindFirstMock: vi.fn(),
  moduleFindManyMock: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthorization: getAdminAuthorizationMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    module: {
      create: moduleCreateMock,
      findFirst: moduleFindFirstMock,
      findMany: moduleFindManyMock,
    },
  },
}))

import * as route from './route'
import { moduleWithSubModulesSelect } from '@/lib/admin-modules'

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

describe('admin modules API', () => {
  beforeEach(() => {
    getAdminAuthorizationMock.mockReset()
    moduleCreateMock.mockReset()
    moduleFindFirstMock.mockReset()
    moduleFindManyMock.mockReset()
  })

  it('exports list and create handlers', () => {
    expect(route.GET).toEqual(expect.any(Function))
    expect(route.POST).toEqual(expect.any(Function))
    expect('PUT' in route).toBe(false)
    expect('PATCH' in route).toBe(false)
    expect('DELETE' in route).toBe(false)
  })

  it('rejects non-admin callers before listing modules', async () => {
    getAdminAuthorizationMock.mockResolvedValue({
      isAuthorized: false,
      status: 403,
      error: 'Admin access required',
    })

    const response = await route.GET()

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Admin access required',
    })
    expect(response.status).toBe(403)
    expect(moduleFindManyMock).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated callers before listing modules', async () => {
    getAdminAuthorizationMock.mockResolvedValue({
      isAuthorized: false,
      status: 401,
      error: 'Unauthorized',
    })

    const response = await route.GET()

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Unauthorized',
    })
    expect(response.status).toBe(401)
    expect(moduleFindManyMock).not.toHaveBeenCalled()
  })

  it('returns sorted module summaries with nested sorted sub-modules', async () => {
    authorizeAdmin()
    moduleFindManyMock.mockResolvedValue([
      {
        id: 2,
        parentModuleId: null,
        parentModule: null,
        label: 'CRM',
        icon: 'Users',
        href: null,
        _count: {
          childModules: 2,
        },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        roleLinks: [{ id: 99 }],
        subModules: [
          {
            id: 12,
            moduleId: 2,
            label: 'Leads',
            icon: 'Target',
            href: '/crm/leads',
            createdAt: new Date('2026-01-03T00:00:00.000Z'),
          },
          {
            id: 11,
            moduleId: 2,
            label: 'Contacts',
            icon: null,
            href: '/crm/contacts',
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          },
        ],
      },
      {
        id: 1,
        parentModuleId: null,
        parentModule: null,
        label: 'Analytics',
        icon: null,
        href: '/analytics',
        _count: {
          childModules: 0,
        },
        subModules: [],
      },
    ])

    const response = await route.GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        modules: [
          {
            id: '1',
            parentModuleId: null,
            parentModuleLabel: null,
            label: 'Analytics',
            icon: null,
            href: '/analytics',
            childModuleCount: 0,
            childModules: [],
            subModules: [],
          },
          {
            id: '2',
            parentModuleId: null,
            parentModuleLabel: null,
            label: 'CRM',
            icon: 'Users',
            href: null,
            childModuleCount: 2,
            childModules: [],
            subModules: [
              {
                id: '11',
                moduleId: '2',
                label: 'Contacts',
                icon: null,
                href: '/crm/contacts',
              },
              {
                id: '12',
                moduleId: '2',
                label: 'Leads',
                icon: 'Target',
                href: '/crm/leads',
              },
            ],
          },
        ],
      },
    })
    expect(JSON.stringify(payload)).not.toContain('createdAt')
    expect(JSON.stringify(payload)).not.toContain('updatedAt')
    expect(JSON.stringify(payload)).not.toContain('roleLinks')
    expect(moduleFindManyMock).toHaveBeenCalledWith({
      orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
      select: moduleWithSubModulesSelect,
    })
  })

  it('creates a module with normalized optional fields', async () => {
    authorizeAdmin()
    moduleFindFirstMock.mockResolvedValue(null)
    moduleCreateMock.mockResolvedValue({
      id: 5,
      parentModuleId: null,
      parentModule: null,
      label: 'Reports',
      icon: 'BarChart',
      href: null,
      _count: {
        childModules: 0,
      },
      subModules: [],
    })

    const response = await route.POST(
      new Request('http://localhost/api/admin/modules', {
        method: 'POST',
        body: JSON.stringify({
          label: ' Reports ',
          icon: ' BarChart ',
          href: ' ',
        }),
      })
    )

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        id: '5',
        parentModuleId: null,
        parentModuleLabel: null,
        label: 'Reports',
        icon: 'BarChart',
        href: null,
        childModuleCount: 0,
        childModules: [],
        subModules: [],
      },
      message: 'Module created successfully',
    })
    expect(response.status).toBe(201)
    expect(moduleFindFirstMock).toHaveBeenCalledWith({
      where: {
        label: {
          equals: 'Reports',
          mode: 'insensitive',
        },
      },
    })
    expect(moduleCreateMock).toHaveBeenCalledWith({
      data: {
        label: 'Reports',
        parentModuleId: null,
        displayOrder: 1,
        icon: 'BarChart',
        href: null,
      },
      select: moduleWithSubModulesSelect,
    })
  })

  it('returns a safe 500 response when module loading fails unexpectedly', async () => {
    authorizeAdmin()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    moduleFindManyMock.mockRejectedValue(new Error('database unavailable'))

    const response = await route.GET()

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Failed to fetch modules',
    })
    expect(response.status).toBe(500)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Admin modules fetch error:',
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
  })
})
