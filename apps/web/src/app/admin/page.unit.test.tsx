import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireAdminSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/lib/admin-auth', () => ({
  requireAdminSession: mocks.requireAdminSession,
}))

import AdminPage from './page'

describe('AdminPage', () => {
  beforeEach(() => {
    mocks.redirect.mockReset()
    mocks.requireAdminSession.mockReset()
    mocks.requireAdminSession.mockResolvedValue(undefined)
  })

  it('authorizes before redirecting to the Roles admin page', async () => {
    await AdminPage()

    expect(mocks.requireAdminSession).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/admin/roles')
    expect(mocks.requireAdminSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.redirect.mock.invocationCallOrder[0]
    )
  })
})
