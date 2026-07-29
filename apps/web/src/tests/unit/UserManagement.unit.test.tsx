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

const availableRoles = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full access',
    userCount: 1,
    moduleCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Support',
    description: null,
    userCount: 1,
    moduleCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'Billing',
    description: null,
    userCount: 0,
    moduleCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

describe('UserManagement', () => {
  it('renders users with available role checkboxes initialized from assigned roles', () => {
    render(<UserManagement initialUsers={initialUsers} availableRoles={availableRoles} />)

    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane User')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getAllByText('Admin')).toHaveLength(2)
    expect(screen.getAllByText('Support')).toHaveLength(2)
    expect(screen.getByRole('checkbox', { name: 'Admin for Jane User' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Support for Jane User' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Billing for Jane User' })).not.toBeChecked()
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

    render(<UserManagement initialUsers={initialUsers} availableRoles={availableRoles} />)

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

    render(<UserManagement initialUsers={initialUsers} availableRoles={availableRoles} />)

    await user.click(screen.getByRole('button', { name: 'Edit Jane User' }))
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'invalid-email')
    await user.click(screen.getByRole('button', { name: 'Save user' }))

    expect(await screen.findByText('Email format is invalid')).toBeInTheDocument()
    expect(screen.getByDisplayValue('invalid-email')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Jane User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Acme')).toBeInTheDocument()
  })

  it('saves changed role assignments and replaces the updated user row', async () => {
    const user = userEvent.setup()
    server.use(
      http.put('*/api/admin/users/2/roles', async ({ request }) => {
        await expect(request.json()).resolves.toEqual({ roleIds: ['1', '3'] })

        return HttpResponse.json({
          success: true,
          message: 'User roles updated successfully',
          data: {
            ...initialUsers[0],
            roles: [
              {
                id: '1',
                name: 'Admin',
                description: 'Full access',
              },
              {
                id: '3',
                name: 'Billing',
                description: null,
              },
            ],
          },
        })
      })
    )

    render(<UserManagement initialUsers={initialUsers} availableRoles={availableRoles} />)

    await user.click(screen.getByRole('checkbox', { name: 'Support for Jane User' }))
    await user.click(screen.getByRole('checkbox', { name: 'Billing for Jane User' }))
    await user.click(screen.getByRole('button', { name: 'Save roles for Jane User' }))

    expect(await screen.findByText('User roles updated successfully')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Admin for Jane User' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Support for Jane User' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Billing for Jane User' })).toBeChecked()
  })

  it('clears all roles and shows the no-role label after success', async () => {
    const user = userEvent.setup()
    server.use(
      http.put('*/api/admin/users/2/roles', async ({ request }) => {
        await expect(request.json()).resolves.toEqual({ roleIds: [] })

        return HttpResponse.json({
          success: true,
          message: 'User roles updated successfully',
          data: {
            ...initialUsers[0],
            roles: [],
          },
        })
      })
    )

    render(<UserManagement initialUsers={initialUsers} availableRoles={availableRoles} />)

    await user.click(screen.getByRole('checkbox', { name: 'Admin for Jane User' }))
    await user.click(screen.getByRole('checkbox', { name: 'Support for Jane User' }))
    await user.click(screen.getByRole('button', { name: 'Save roles for Jane User' }))

    expect(await screen.findByText('User roles updated successfully')).toBeInTheDocument()
    expect(screen.getByText('No roles assigned')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Admin for Jane User' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Support for Jane User' })).not.toBeChecked()
  })

  it('shows role API errors while keeping edited selections and persisted role labels', async () => {
    const user = userEvent.setup()
    server.use(
      http.put('*/api/admin/users/2/roles', async () =>
        HttpResponse.json(
          {
            success: false,
            error: 'At least one admin user is required',
          },
          { status: 409 }
        )
      )
    )

    render(<UserManagement initialUsers={initialUsers} availableRoles={availableRoles} />)

    await user.click(screen.getByRole('checkbox', { name: 'Admin for Jane User' }))
    await user.click(screen.getByRole('button', { name: 'Save roles for Jane User' }))

    expect(await screen.findByText('At least one admin user is required')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Admin for Jane User' })).not.toBeChecked()
    expect(screen.getAllByText('Admin')).toHaveLength(2)
    expect(screen.getAllByText('Support')).toHaveLength(2)
  })

  it('shows an empty state when no roles are available', () => {
    render(<UserManagement initialUsers={initialUsers} availableRoles={[]} />)

    expect(screen.getByText('No available roles')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save roles for Jane User' })).toBeDisabled()
  })
})
