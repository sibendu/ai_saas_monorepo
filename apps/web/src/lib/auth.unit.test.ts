import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const redirectMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/app/api/auth/[...nextauth]/auth-options', () => ({
  authOptions: {},
}))

describe('requireAuthenticatedSession', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset()
    redirectMock.mockReset()
  })

  it('returns the session when one exists', async () => {
    const session = {
      user: {
        email: 'alice@example.com',
        name: 'Alice',
      },
    }

    getServerSessionMock.mockResolvedValue(session)

    const { requireAuthenticatedSession } = await import('./auth')

    await expect(requireAuthenticatedSession()).resolves.toEqual(session)
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('redirects to login when there is no active session', async () => {
    getServerSessionMock.mockResolvedValue(null)

    const { requireAuthenticatedSession } = await import('./auth')

    await requireAuthenticatedSession()

    expect(redirectMock).toHaveBeenCalledWith('/login')
  })
})
