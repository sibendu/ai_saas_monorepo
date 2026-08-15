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
  default: ({
    user,
  }: {
    user: {
      company?: string | null
      email?: string | null
      firstName?: string | null
      lastName?: string | null
      name?: string | null
    }
  }) => ({
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
      addresses: [],
      company: 'Acme',
      contacts: [],
      dob: null,
      email: 'db@example.com',
      firstName: 'Database',
      lastName: 'User',
      middleName: null,
      name: 'Database User',
    })

    const result = await PreferencesPage()

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'session@example.com',
      },
      select: {
        addresses: {
          orderBy: { id: 'asc' },
          select: {
            addressLine1: true,
            addressLine2: true,
            addressLine3: true,
            city: true,
            country: true,
            district: true,
            pin: true,
            state: true,
            type: true,
          },
        },
        company: true,
        contacts: {
          orderBy: { id: 'asc' },
          select: {
            contact: true,
            countryCode: true,
            type: true,
          },
        },
        dob: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        name: true,
      },
    })
    expect(result).toMatchObject({
      props: {
        user: {
          company: 'Acme',
          email: 'db@example.com',
          firstName: 'Database',
          lastName: 'User',
          name: 'Database User',
        },
      },
    })
  })
})
