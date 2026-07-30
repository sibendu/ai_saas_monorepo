import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminManagementTabs from '@/components/admin/AdminManagementTabs'

const initialRoles = [
  {
    id: '1',
    name: 'Manager',
    description: 'Manager access',
    userCount: 0,
    moduleCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

const initialUsers = [
  {
    id: '2',
    email: 'jane@example.com',
    name: 'Jane User',
    company: null,
    roles: [],
  },
]

const initialModules = [
  {
    id: '3',
    label: 'Analytics',
    icon: null,
    href: '/analytics',
    subModules: [
      {
        id: '4',
        moduleId: '3',
        label: 'Campaigns',
        icon: null,
        href: '/analytics/campaigns',
      },
    ],
  },
]

describe('AdminManagementTabs', () => {
  it('switches between roles, users, and enabled modules tabs', async () => {
    const user = userEvent.setup()

    render(
      <AdminManagementTabs
        initialRoles={initialRoles}
        initialUsers={initialUsers}
        initialModules={initialModules}
      />
    )

    expect(screen.getByText('Manager')).toBeInTheDocument()
    const rolesTab = screen.getByRole('button', { name: 'Roles' })
    const usersTab = screen.getByRole('button', { name: 'Users' })
    const modulesTab = screen.getByRole('button', { name: 'Modules' })

    expect(rolesTab).toHaveClass('bg-indigo-600', 'text-white')
    expect(usersTab).toHaveClass('text-gray-700', 'hover:bg-gray-100')
    expect(modulesTab).toBeEnabled()
    expect(modulesTab).toHaveClass('text-gray-700', 'hover:bg-gray-100')

    await user.click(usersTab)

    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('No roles assigned')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Manager for Jane User' })).not.toBeChecked()
    expect(usersTab).toHaveClass('bg-indigo-600', 'text-white')
    expect(modulesTab).toHaveClass('text-gray-700', 'hover:bg-gray-100')

    await user.click(modulesTab)

    expect(screen.getByRole('heading', { name: 'Role module access' })).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Campaigns')).toBeInTheDocument()
    expect(modulesTab).toHaveClass('bg-indigo-600', 'text-white')
    expect(rolesTab).toHaveClass('text-gray-700', 'hover:bg-gray-100')

    await user.click(rolesTab)

    expect(screen.getByText('Manager access')).toBeInTheDocument()
  })
})
