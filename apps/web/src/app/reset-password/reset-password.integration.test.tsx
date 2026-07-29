import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import ResetPasswordPage from './page'
import { server } from '@/tests/msw/server'

const pushMock = vi.fn()
const refreshMock = vi.fn()
const signInMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => new URLSearchParams('token=activation-token'),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}))

describe('ResetPasswordPage activation token flow', () => {
  beforeEach(() => {
    pushMock.mockClear()
    refreshMock.mockClear()
    signInMock.mockClear()
  })

  it('submits token query parameter to reset password api', async () => {
    signInMock.mockResolvedValue({ ok: true })
    let submittedBody: unknown
    server.use(
      http.post('*/api/auth/reset-password', async ({ request }) => {
        submittedBody = await request.json()

        return HttpResponse.json({
          message: 'Password reset successful',
          email: 'user@example.com',
        })
      })
    )
    const user = userEvent.setup()

    render(<ResetPasswordPage />)

    await user.type(screen.getByLabelText('New Password'), 'new-password')
    await user.type(screen.getByLabelText('Confirm Password'), 'new-password')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(submittedBody).toEqual({
      token: 'activation-token',
      password: 'new-password',
      confirmPassword: 'new-password',
    })
    expect(signInMock).toHaveBeenCalledWith('credentials', {
      email: 'user@example.com',
      password: 'new-password',
      redirect: false,
    })
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })
})
