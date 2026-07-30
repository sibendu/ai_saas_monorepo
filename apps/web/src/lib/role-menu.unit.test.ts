import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { menuSections } from '@/config/navigation'

const authMocks = vi.hoisted(() => ({
  isSessionUserAdmin: vi.fn(),
  requireAuthenticatedSession: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  isSessionUserAdmin: authMocks.isSessionUserAdmin,
}))

vi.mock('@/lib/auth', () => ({
  requireAuthenticatedSession: authMocks.requireAuthenticatedSession,
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
    authMocks.isSessionUserAdmin.mockReset()
    authMocks.requireAuthenticatedSession.mockResolvedValue({
      user: {
        email: 'admin@example.com',
        name: 'Admin User',
      },
      expires: '2026-12-31T00:00:00.000Z',
    })
    authMocks.isSessionUserAdmin.mockResolvedValue(false)

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

  it.each(fallbackCases)('keeps configured menu fallback for %s', async (_caseName, factory) => {
    const fetchMock = vi.fn(factory)
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAllowedMenuSections('user@example.com')).resolves.toEqual(menuSections)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('preserves Admin navigation injection when role-driven modules are empty', async () => {
    authMocks.isSessionUserAdmin.mockResolvedValue(true)
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

    const shellData = await getAuthenticatedShellData()

    expect(shellData.menuSections).toEqual([
      {
        id: 'admin',
        label: 'Admin',
        icon: 'settings',
        items: [
          {
            label: 'Admin',
            href: '/admin',
            icon: 'settings',
          },
        ],
      },
    ])
  })
})
