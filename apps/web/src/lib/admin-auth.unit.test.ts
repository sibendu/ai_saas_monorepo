import { beforeEach, describe, expect, it, vi } from 'vitest'

const { customerFindFirstMock, getServerSessionMock, redirectMock } = vi.hoisted(() => ({
  customerFindFirstMock: vi.fn(),
  getServerSessionMock: vi.fn(),
  redirectMock: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/app/api/auth/[...nextauth]/auth-options', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findFirst: customerFindFirstMock,
    },
  },
}))

import { getAdminAuthorization, isSessionUserAdmin, requireAdminSession } from './admin-auth'

describe('admin auth helpers', () => {
  beforeEach(() => {
    customerFindFirstMock.mockReset()
    getServerSessionMock.mockReset()
    redirectMock.mockReset()
  })

  it('allows users with the Admin role', async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        email: 'admin@example.com',
      },
    })
    customerFindFirstMock.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      name: 'Admin User',
      company: 'SaaS Foundation',
      userRoles: [{ role: { name: 'Admin' } }],
    })

    await expect(getAdminAuthorization()).resolves.toMatchObject({
      isAuthorized: true,
      customer: {
        email: 'admin@example.com',
      },
    })
  })

  it('denies authenticated users without the Admin role', async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        email: 'user@example.com',
      },
    })
    customerFindFirstMock.mockResolvedValue({
      id: 2,
      email: 'user@example.com',
      name: 'User',
      company: null,
      userRoles: [{ role: { name: 'User' } }],
    })

    await expect(getAdminAuthorization()).resolves.toEqual({
      isAuthorized: false,
      status: 403,
      error: 'Admin access required',
    })
  })

  it('returns an authorization error when admin lookup fails', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    getServerSessionMock.mockResolvedValue({
      user: {
        email: 'admin@example.com',
      },
    })
    customerFindFirstMock.mockRejectedValue(new Error('database unavailable'))

    await expect(getAdminAuthorization()).resolves.toEqual({
      isAuthorized: false,
      status: 500,
      error: 'Failed to verify admin access',
    })
    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Admin authorization lookup failed:',
      expect.any(Error)
    )

    consoleErrorMock.mockRestore()
  })

  it('redirects non-admin page access to the dashboard', async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        email: 'user@example.com',
      },
    })
    customerFindFirstMock.mockResolvedValue({
      id: 2,
      email: 'user@example.com',
      name: 'User',
      company: null,
      userRoles: [{ role: { name: 'User' } }],
    })

    await requireAdminSession()

    expect(redirectMock).toHaveBeenCalledWith('/dashboard')
  })

  it('fails closed when the shell admin-menu lookup errors', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    customerFindFirstMock.mockRejectedValue(new Error('database unavailable'))

    await expect(isSessionUserAdmin('admin@example.com')).resolves.toBe(false)

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Admin menu role check failed:',
      expect.any(Error)
    )
    consoleErrorMock.mockRestore()
  })
})
