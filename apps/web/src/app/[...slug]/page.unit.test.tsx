import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedShellData: vi.fn(),
}))

vi.mock('@/lib/role-menu', () => ({
  getAuthenticatedShellData: mocks.getAuthenticatedShellData,
}))

vi.mock('@/components/AppShell', () => ({
  default: ({
    children,
    pageSubtitle,
    pageTitle,
  }: {
    children: ReactNode
    pageSubtitle?: string
    pageTitle: string
  }) => (
    <main>
      <h1>{pageTitle}</h1>
      {pageSubtitle && <p>{pageSubtitle}</p>}
      {children}
    </main>
  ),
}))

import UnimplementedFeaturePage from './page'

describe('UnimplementedFeaturePage', () => {
  beforeEach(() => {
    mocks.getAuthenticatedShellData.mockReset()
    mocks.getAuthenticatedShellData.mockResolvedValue({
      session: {
        user: {
          email: 'admin@example.com',
          name: 'Admin User',
        },
      },
      menuSections: [],
      menuLayout: 'left',
    })
  })

  it('renders the generic not implemented message inside the app shell', async () => {
    render(await UnimplementedFeaturePage())

    expect(screen.getByRole('heading', { name: 'Feature unavailable' })).toBeInTheDocument()
    expect(screen.getByText('This feature is not implemented yet')).toBeInTheDocument()
    expect(mocks.getAuthenticatedShellData).toHaveBeenCalledTimes(1)
  })
})
