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

describe('AdminManagementTabs', () => {
  it('switches from roles to users and leaves modules disabled', async () => {
    const user = userEvent.setup()

    render(<AdminManagementTabs initialRoles={initialRoles} initialUsers={initialUsers} />)

    expect(screen.getByText('Manager')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modules' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Users' }))

    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('No roles assigned')).toBeInTheDocument()
  })
})
