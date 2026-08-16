import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const signOutMock = vi.fn()
const routerPushMock = vi.fn()
const routerRefreshMock = vi.fn()

vi.mock('next-auth/react', () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
    refresh: routerRefreshMock,
  }),
}))

import Header from '@/components/Header'
import { AppNameProvider } from '@/components/AppNameProvider'

describe('Header', () => {
  beforeEach(() => {
    signOutMock.mockClear()
    routerPushMock.mockClear()
    routerRefreshMock.mockClear()
  })

  it('renders user details', () => {
    render(<Header user={{ name: 'Alice', email: 'alice@example.com', company: 'Acme Inc' }} />)

    expect(screen.getByText('SaaS Platform')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('(Acme Inc)')).toBeInTheDocument()
  })

  it('signs out without server redirect and navigates to login', async () => {
    render(<Header user={{ email: 'alice@example.com' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))

    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: '/login', redirect: false })
    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith('/login')
    })
    expect(routerRefreshMock).toHaveBeenCalled()
  })

  it('renders the configured application name', () => {
    render(
      <AppNameProvider appName="Acme Workspace">
        <Header user={{ email: 'alice@example.com' }} />
      </AppNameProvider>
    )

    expect(screen.getByText('Acme Workspace')).toBeInTheDocument()
  })

  it('falls back to the default name when the configured name is blank', () => {
    render(
      <AppNameProvider appName="   ">
        <Header user={{ email: 'alice@example.com' }} />
      </AppNameProvider>
    )

    expect(screen.getByText('SaaS Platform')).toBeInTheDocument()
  })
})
