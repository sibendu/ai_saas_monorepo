import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

const signOutMock = vi.fn()
let currentPathname = '/dashboard'

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, onClick, className }: { href: string; children: ReactNode; onClick?: () => void; className?: string }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('next-auth/react', () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}))

import AppShell from '@/components/AppShell'

describe('AppShell', () => {
  beforeEach(() => {
    currentPathname = '/dashboard'
    signOutMock.mockClear()
  })

  it('renders shell metadata and navigation items', () => {
    render(
      <AppShell user={{ name: 'Demo User', email: 'demo@example.com' }} pageTitle="Dashboard" pageSubtitle="Overview">
        <div>Dashboard Content</div>
      </AppShell>
    )

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
    expect(screen.getByText('Demo User')).toBeInTheDocument()
    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('Task List')).toBeInTheDocument()
    expect(screen.getByText('Preferences')).toBeInTheDocument()
  })

  it('calls signOut when logout is clicked', () => {
    render(
      <AppShell user={{ name: 'Demo User' }} pageTitle="Dashboard">
        <div>Body</div>
      </AppShell>
    )

    const logoutButtons = screen.getAllByRole('button', { name: 'Logout' })
    fireEvent.click(logoutButtons[0])

    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: '/login' })
  })

  it('renders provided menu sections instead of static fallback navigation', () => {
    render(
      <AppShell
        user={{ name: 'Demo User' }}
        pageTitle="Dashboard"
        menuSections={[
          {
            id: 'sales',
            label: 'Sales',
            icon: 'workspace',
            items: [
              {
                label: 'Leads',
                href: '/leads',
                icon: 'users',
              },
            ],
          },
        ]}
      >
        <div>Body</div>
      </AppShell>
    )

    expect(screen.getByText('Sales')).toBeInTheDocument()
    expect(screen.getByText('Leads')).toBeInTheDocument()
    expect(screen.queryByText('Customers')).not.toBeInTheDocument()
    expect(screen.queryByText('Preferences')).not.toBeInTheDocument()
  })

  it('renders the top menu layout when configured', () => {
    render(
      <AppShell
        user={{ name: 'Demo User' }}
        pageTitle="Dashboard"
        menuLayout="top"
        menuSections={[
          {
            id: 'sales',
            label: 'Sales',
            icon: 'workspace',
            items: [
              {
                label: 'Leads',
                href: '/leads',
                icon: 'users',
              },
            ],
          },
        ]}
      >
        <div>Body</div>
      </AppShell>
    )

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getByText('SaaS Platform')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sales/ })).toBeInTheDocument()
    expect(screen.getByText('Leads')).toBeInTheDocument()
    expect(screen.queryByLabelText('Toggle sidebar')).not.toBeInTheDocument()
  })

  it('renders single-item top-level sections as direct links in top layout', () => {
    render(
      <AppShell
        user={{ name: 'Demo User' }}
        pageTitle="Dashboard"
        menuLayout="top"
        menuSections={[
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: 'workspace',
            items: [
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: 'workspace',
              },
            ],
          },
        ]}
      >
        <div>Body</div>
      </AppShell>
    )

    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dashboard/ })).not.toBeInTheDocument()
  })

  it('renders grouped top-level sections as dropdown triggers in top layout', () => {
    render(
      <AppShell
        user={{ name: 'Demo User' }}
        pageTitle="Dashboard"
        menuLayout="top"
        menuSections={[
          {
            id: 'settings',
            label: 'Settings',
            icon: 'settings',
            items: [
              {
                label: 'Preferences',
                href: '/preferences',
                icon: 'profile',
              },
            ],
          },
        ]}
      >
        <div>Body</div>
      </AppShell>
    )

    expect(screen.getByRole('button', { name: /Settings/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Preferences/ })).toBeInTheDocument()
  })

  it('toggles desktop top-menu dropdowns by click and dismisses with Escape', () => {
    render(
      <AppShell
        user={{ name: 'Demo User' }}
        pageTitle="Dashboard"
        menuLayout="top"
        menuSections={[
          {
            id: 'sales',
            label: 'Sales',
            icon: 'workspace',
            items: [
              {
                label: 'Leads',
                href: '/leads',
                icon: 'users',
              },
            ],
          },
        ]}
      >
        <div>Body</div>
      </AppShell>
    )

    const salesButton = screen.getByRole('button', { name: /Sales/ })

    expect(salesButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(salesButton)

    expect(salesButton).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(screen.getByTestId('top-menu-section-sales'), { key: 'Escape' })

    expect(salesButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('marks nested top-menu routes active', () => {
    currentPathname = '/customers/123'

    render(
      <AppShell
        user={{ name: 'Demo User' }}
        pageTitle="Customer Detail"
        menuLayout="top"
        menuSections={[
          {
            id: 'workspace',
            label: 'Workspace',
            icon: 'workspace',
            items: [
              {
                label: 'Customers',
                href: '/customers',
                icon: 'users',
              },
            ],
          },
        ]}
      >
        <div>Body</div>
      </AppShell>
    )

    expect(screen.getByRole('button', { name: /Workspace/ })).toHaveClass('border-indigo-600')
    expect(screen.getByRole('link', { name: /Customers/ })).toHaveClass('bg-indigo-100')
  })

  it('renders direct sidebar sections as single links without duplicate nested items', () => {
    render(
      <AppShell
        user={{ name: 'Demo User' }}
        pageTitle="Dashboard"
        menuSections={[
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: 'workspace',
            items: [
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: 'workspace',
              },
            ],
          },
        ]}
      >
        <div>Body</div>
      </AppShell>
    )

    expect(screen.getAllByRole('link', { name: /Dashboard/ }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Dashboard/ })).not.toBeInTheDocument()
  })

  it('opens and closes the mobile top menu from hamburger navigation', () => {
    render(
      <AppShell
        user={{ name: 'Demo User' }}
        pageTitle="Dashboard"
        menuLayout="top"
        menuSections={[
          {
            id: 'sales',
            label: 'Sales',
            icon: 'workspace',
            items: [
              {
                label: 'Leads',
                href: '/leads',
                icon: 'users',
              },
            ],
          },
        ]}
      >
        <div>Body</div>
      </AppShell>
    )

    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()

    const toggleButton = screen.getByRole('button', { name: 'Toggle mobile top menu' })

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggleButton)

    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true')

    const leadsLinks = screen.getAllByRole('link', { name: /Leads/ })
    fireEvent.click(leadsLinks[1])

    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  })
})
