import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  requireAuthenticatedSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  requireAuthenticatedSession: mocks.requireAuthenticatedSession,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findFirst: mocks.findFirst,
    },
  },
}))

vi.mock('./PreferencesForm', () => ({
  default: ({ user }: { user: { company?: string | null; email?: string | null; name?: string | null } }) => ({
    props: {
      user,
    },
    type: 'PreferencesForm',
  }),
}))

import PreferencesPage from './page'

describe('PreferencesPage', () => {
  beforeEach(() => {
    mocks.requireAuthenticatedSession.mockReset()
    mocks.findFirst.mockReset()
  })

  it('requires an authenticated server session before rendering', async () => {
    mocks.requireAuthenticatedSession.mockResolvedValue({
      user: {
        email: 'session@example.com',
        name: 'Session User',
      },
    })
    mocks.findFirst.mockResolvedValue(null)

    await PreferencesPage()

    expect(mocks.requireAuthenticatedSession).toHaveBeenCalled()
  })

  it('loads preferences data on the server from the customer record', async () => {
    mocks.requireAuthenticatedSession.mockResolvedValue({
      user: {
        email: 'session@example.com',
        name: 'Session User',
      },
    })
    mocks.findFirst.mockResolvedValue({
      company: 'Acme',
      email: 'db@example.com',
      name: 'Database User',
    })

    const result = await PreferencesPage()

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'session@example.com',
      },
      select: {
        company: true,
        email: true,
        name: true,
      },
    })
    expect(result).toMatchObject({
      props: {
        user: {
          company: 'Acme',
          email: 'db@example.com',
          name: 'Database User',
        },
      },
    })
  })
})
