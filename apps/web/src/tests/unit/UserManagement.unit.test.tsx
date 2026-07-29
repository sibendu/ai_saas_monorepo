import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/tests/msw/server'
import UserManagement from '@/components/admin/UserManagement'

const initialUsers = [
  {
    id: '2',
    email: 'jane@example.com',
    name: 'Jane User',
    company: 'Acme',
    roles: [
      {
        id: '1',
        name: 'Admin',
        description: 'Full access',
      },
      {
        id: '2',
        name: 'Support',
        description: null,
      },
    ],
  },
]

describe('UserManagement', () => {
  it('renders users with read-only assigned roles', () => {
    render(<UserManagement initialUsers={initialUsers} />)

    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane User')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('updates a user row after a successful edit', async () => {
    const user = userEvent.setup()
    server.use(
      http.put('*/api/admin/users/2', async () =>
        HttpResponse.json({
          success: true,
          message: 'User updated successfully',
          data: {
            id: '2',
            email: 'jane.updated@example.com',
            name: 'Jane Updated',
            company: null,
            roles: initialUsers[0].roles,
          },
        })
      )
    )

    render(<UserManagement initialUsers={initialUsers} />)

    await user.click(screen.getByRole('button', { name: 'Edit Jane User' }))
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Jane Updated')
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'jane.updated@example.com')
    await user.clear(screen.getByLabelText('Company'))
    await user.click(screen.getByRole('button', { name: 'Save user' }))

    expect(await screen.findByText('User updated successfully')).toBeInTheDocument()
    expect(screen.getByText('jane.updated@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Updated')).toBeInTheDocument()
    expect(screen.getByText('No company')).toBeInTheDocument()
  })

  it('shows API validation errors without replacing the row', async () => {
    const user = userEvent.setup()
    server.use(
      http.put('*/api/admin/users/2', async () =>
        HttpResponse.json(
          {
            success: false,
            error: 'Email format is invalid',
          },
          { status: 400 }
        )
      )
    )

    render(<UserManagement initialUsers={initialUsers} />)

    await user.click(screen.getByRole('button', { name: 'Edit Jane User' }))
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'invalid-email')
    await user.click(screen.getByRole('button', { name: 'Save user' }))

    expect(await screen.findByText('Email format is invalid')).toBeInTheDocument()
    expect(screen.getByDisplayValue('invalid-email')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Jane User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Acme')).toBeInTheDocument()
  })
})
