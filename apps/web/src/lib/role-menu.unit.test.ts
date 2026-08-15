import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { menuSections } from '@/config/navigation'

const authMocks = vi.hoisted(() => ({
  requireAuthenticatedSession: vi.fn(),
}))

const prismaMocks = vi.hoisted(() => ({
  moduleFindMany: vi.fn(),
  userGroupMemberFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  requireAuthenticatedSession: authMocks.requireAuthenticatedSession,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    module: {
      findMany: prismaMocks.moduleFindMany,
    },
    userGroupMember: {
      findMany: prismaMocks.userGroupMemberFindMany,
    },
  },
}))

import { getAllowedMenuSections, getAuthenticatedShellData } from '@/lib/role-menu'

const originalBffInternalUrl = process.env.BFF_INTERNAL_URL
const originalNextPublicBffUrl = process.env.NEXT_PUBLIC_BFF_URL

function restoreEnvValue(key: 'BFF_INTERNAL_URL' | 'NEXT_PUBLIC_BFF_URL', value: string | undefined) {
  if (value === undefined) {
    delete process.env[key]
    return
  }

  process.env[key] = value
}

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    statusText: init?.statusText,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

type FetchResultFactory = () => Promise<Response>

describe('role-menu', () => {
  beforeEach(() => {
    process.env.BFF_INTERNAL_URL = 'http://bff.test'
    delete process.env.NEXT_PUBLIC_BFF_URL

    authMocks.requireAuthenticatedSession.mockReset()
    authMocks.requireAuthenticatedSession.mockResolvedValue({
      user: {
        email: 'admin@example.com',
        name: 'Admin User',
      },
      expires: '2026-12-31T00:00:00.000Z',
    })

    prismaMocks.userGroupMemberFindMany.mockReset()
    prismaMocks.userGroupMemberFindMany.mockResolvedValue([])
    prismaMocks.moduleFindMany.mockReset()
    prismaMocks.moduleFindMany.mockResolvedValue([])

    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    restoreEnvValue('BFF_INTERNAL_URL', originalBffInternalUrl)
    restoreEnvValue('NEXT_PUBLIC_BFF_URL', originalNextPublicBffUrl)
  })

  it('returns an empty role-driven menu for a successful empty BFF response', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createJsonResponse({
          success: true,
          roles: [],
          modules: [],
        })
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAllowedMenuSections('user@example.com')).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://bff.test/api/user/roles?email=user%40example.com',
      { cache: 'no-store' }
    )
  })

  it('keeps configured menu fallback when no email is available', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAllowedMenuSections(null)).resolves.toEqual(menuSections)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  const fallbackCases: Array<[string, FetchResultFactory]> = [
    [
      'fetch failures',
      () => Promise.reject(new Error('BFF unavailable')),
    ],
    [
      'non-OK responses',
      () => Promise.resolve(new Response(null, { status: 502, statusText: 'Bad Gateway' })),
    ],
    [
      'invalid payloads',
      () =>
        Promise.resolve(
          createJsonResponse({
            success: true,
            modules: [
              {
                id: 'workspace',
                label: 'Workspace',
              },
            ],
          })
        ),
    ],
  ]

  it.each(fallbackCases)('uses database role menu fallback for %s', async (_caseName, factory) => {
    const fetchMock = vi.fn(factory)
    vi.stubGlobal('fetch', fetchMock)
    prismaMocks.userGroupMemberFindMany.mockResolvedValue([
      {
        group: {
          roles: [
            {
              role: {
                id: 1,
                name: 'Manager',
                description: null,
                modules: [
                  {
                    module: {
                      id: 10,
                      parentModuleId: null,
                      label: 'Admin',
                      displayOrder: 1,
                      icon: 'settings',
                      href: null,
                      parentModule: null,
                    },
                    subModule: {
                      id: 20,
                      label: 'Roles',
                      displayOrder: 1,
                      icon: 'settings',
                      href: '/admin/roles',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ])

    await expect(getAllowedMenuSections('USER@example.com')).resolves.toEqual([
      {
        id: '10',
        label: 'Admin',
        icon: 'settings',
        items: [
          {
            label: 'Roles',
            href: '/admin/roles',
            icon: 'settings',
          },
        ],
      },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(prismaMocks.userGroupMemberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customer: {
            email: 'user@example.com',
          },
        },
      })
    )
  })

  it('uses Admin navigation from role-driven modules', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createJsonResponse({
          success: true,
          roles: [],
          modules: [
            {
              id: '5',
              label: 'Admin',
              icon: 'settings',
              href: '/admin/roles',
              subModules: [
                {
                  id: '50',
                  label: 'Groups',
                  icon: 'users',
                  href: '/admin/groups',
                },
              ],
            },
          ],
        })
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const shellData = await getAuthenticatedShellData()

    expect(shellData.menuSections).toEqual([
      {
        id: '5',
        label: 'Admin',
        icon: 'settings',
        items: [
          {
            label: 'Groups',
            href: '/admin/groups',
            icon: 'users',
          },
        ],
      },
    ])
  })

  it('orders role-driven modules and sub-modules by display order', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createJsonResponse({
          success: true,
          roles: [],
          modules: [
            {
              id: '5',
              label: 'Admin',
              displayOrder: 5,
              icon: 'settings',
              href: null,
              subModules: [
                {
                  id: '53',
                  label: 'Groups',
                  displayOrder: 3,
                  icon: 'users',
                  href: '/admin/groups',
                },
                {
                  id: '51',
                  label: 'Roles',
                  displayOrder: 1,
                  icon: 'settings',
                  href: '/admin/roles',
                },
              ],
            },
            {
              id: '1',
              label: 'Home',
              displayOrder: 1,
              icon: 'workspace',
              href: '/dashboard',
              subModules: [],
            },
          ],
        })
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAllowedMenuSections('admin@example.com')).resolves.toEqual([
      {
        id: '1',
        label: 'Home',
        icon: 'workspace',
        items: [
          {
            label: 'Home',
            href: '/home',
            icon: 'workspace',
          },
        ],
      },
      {
        id: '5',
        label: 'Admin',
        icon: 'settings',
        items: [
          {
            label: 'Roles',
            href: '/admin/roles',
            icon: 'settings',
          },
          {
            label: 'Groups',
            href: '/admin/groups',
            icon: 'users',
          },
        ],
      },
    ])
  })

  it('includes unmapped configured modules for admin database fallback menus', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('BFF unavailable')))
    vi.stubGlobal('fetch', fetchMock)
    prismaMocks.userGroupMemberFindMany.mockResolvedValue([
      {
        group: {
          roles: [
            {
              role: {
                id: 1,
                name: 'Admin',
                description: null,
                modules: [],
              },
            },
          ],
        },
      },
    ])
    prismaMocks.moduleFindMany.mockResolvedValue([
      {
        id: 34,
        parentModuleId: null,
        label: 'Marketing',
        displayOrder: 5,
        icon: null,
        href: '/marketing',
        childModules: [
          {
            id: 35,
            label: 'Campaign',
            displayOrder: 1,
            icon: null,
            href: '/campaign',
          },
        ],
        subModules: [],
      },
    ])

    await expect(getAllowedMenuSections('admin@example.com')).resolves.toEqual([
      {
        id: '34',
        label: 'Marketing',
        icon: 'workspace',
        items: [
          {
            label: 'Campaign',
            href: '/campaign',
            icon: 'chevron',
          },
        ],
      },
    ])
  })
})
