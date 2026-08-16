import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppNameProvider } from '@/components/AppNameProvider'
import ActivateAccountPage from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams('token=activation-token'),
}))

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }))

describe('ActivateAccountPage', () => {
  it('uses the current authentication page style and accepts an activation token', () => {
    render(
      <AppNameProvider appName="Workspace">
        <ActivateAccountPage />
      </AppNameProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Activate your account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Create password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Activate account' })).toBeInTheDocument()
  })
})
