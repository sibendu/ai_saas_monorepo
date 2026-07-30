import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  customerFindMany: vi.fn(),
  getAuthenticatedShellData: vi.fn(),
  moduleFindMany: vi.fn(),
  requireAdminSession: vi.fn(),
  roleFindMany: vi.fn(),
}))

vi.mock('@/components/AppShell', () => ({
  default: 'AppShell',
}))

vi.mock('@/components/admin/AdminManagementTabs', () => ({
  default: 'AdminManagementTabs',
}))

vi.mock('@/lib/admin-auth', () => ({
  requireAdminSession: mocks.requireAdminSession,
}))

vi.mock('@/lib/role-menu', () => ({
  getAuthenticatedShellData: mocks.getAuthenticatedShellData,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: mocks.customerFindMany,
    },
    module: {
      findMany: mocks.moduleFindMany,
    },
    role: {
      findMany: mocks.roleFindMany,
    },
  },
}))

import AdminPage from './page'
import { moduleWithSubModulesSelect } from '@/lib/admin-modules'
import { adminUserSelect } from '@/lib/admin-users'

describe('AdminPage', () => {
  beforeEach(() => {
    mocks.customerFindMany.mockReset()
    mocks.getAuthenticatedShellData.mockReset()
    mocks.moduleFindMany.mockReset()
    mocks.requireAdminSession.mockReset()
    mocks.roleFindMany.mockReset()

    mocks.requireAdminSession.mockResolvedValue(undefined)
    mocks.getAuthenticatedShellData.mockResolvedValue({
      session: {
        user: {
          email: 'admin@example.com',
          name: 'Admin User',
        },
      },
      menuSections: [{ id: 'dashboard', label: 'Dashboard', items: [] }],
      menuLayout: 'left',
    })
    mocks.roleFindMany.mockResolvedValue([
      {
        id: 2,
        name: 'Manager',
        description: 'Manager access',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        _count: {
          users: 3,
          modules: 4,
        },
      },
    ])
    mocks.customerFindMany.mockResolvedValue([
      {
        id: 5,
        email: 'jane@example.com',
        name: 'Jane User',
        company: null,
        userRoles: [
          {
            role: {
              id: 2,
              name: 'Manager',
              description: 'Manager access',
            },
          },
        ],
      },
    ])
    mocks.moduleFindMany.mockResolvedValue([
      {
        id: 9,
        label: 'Sales',
        icon: 'users',
        href: null,
        subModules: [
          {
            id: 12,
            moduleId: 9,
            label: 'Leads',
            icon: null,
            href: '/sales/leads',
          },
        ],
      },
    ])
  })

  it('authorizes before loading shell, roles, users, and module summaries', async () => {
    const result = await AdminPage()

    expect(mocks.requireAdminSession).toHaveBeenCalledTimes(1)
    expect(mocks.requireAdminSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getAuthenticatedShellData.mock.invocationCallOrder[0]
    )
    expect(mocks.requireAdminSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.roleFindMany.mock.invocationCallOrder[0]
    )
    expect(mocks.requireAdminSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.customerFindMany.mock.invocationCallOrder[0]
    )
    expect(mocks.requireAdminSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.moduleFindMany.mock.invocationCallOrder[0]
    )

    expect(mocks.roleFindMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            modules: true,
          },
        },
      },
    })
    expect(mocks.customerFindMany).toHaveBeenCalledWith({
      orderBy: { email: 'asc' },
      select: adminUserSelect,
    })
    expect(mocks.moduleFindMany).toHaveBeenCalledWith({
      orderBy: { label: 'asc' },
      select: moduleWithSubModulesSelect,
    })

    expect(result).toMatchObject({
      type: 'AppShell',
      props: {
        pageTitle: 'Admin',
        pageSubtitle: 'Manage access, roles, and permissions',
        user: {
          email: 'admin@example.com',
          name: 'Admin User',
        },
        children: {
          type: 'AdminManagementTabs',
          props: {
            initialRoles: [
              {
                id: '2',
                name: 'Manager',
                description: 'Manager access',
                userCount: 3,
                moduleCount: 4,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-02T00:00:00.000Z',
              },
            ],
            initialUsers: [
              {
                id: '5',
                email: 'jane@example.com',
                name: 'Jane User',
                company: null,
                roles: [
                  {
                    id: '2',
                    name: 'Manager',
                    description: 'Manager access',
                  },
                ],
              },
            ],
            initialModules: [
              {
                id: '9',
                label: 'Sales',
                icon: 'users',
                href: null,
                subModules: [
                  {
                    id: '12',
                    moduleId: '9',
                    label: 'Leads',
                    icon: null,
                    href: '/sales/leads',
                  },
                ],
              },
            ],
          },
        },
      },
    })
  })
})
