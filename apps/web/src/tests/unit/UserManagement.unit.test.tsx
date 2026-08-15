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
    firstName: 'Jane',
    middleName: 'K',
    lastName: 'User',
    company: 'Acme',
    groups: [
      {
        id: '10',
        name: 'Support Team',
        description: 'Support users',
      },
    ],
  },
]

const availableGroups = [
  {
    id: '10',
    name: 'Support Team',
    description: 'Support users',
    memberCount: 1,
    roles: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: '11',
    name: 'Finance Team',
    description: null,
    memberCount: 0,
    roles: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

function renderUsers() {
  return render(
    <UserManagement
      initialUsers={initialUsers}
      availableGroups={availableGroups}
    />
  )
}

describe('UserManagement', () => {
  it('renders each user with assigned groups', () => {
    renderUsers()

    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane K User')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Support Team')).toBeInTheDocument()
  })

  it('updates profile and groups from the edit row', async () => {
    const user = userEvent.setup()

    server.use(
      http.put('*/api/admin/users/2', async () =>
        HttpResponse.json({
          success: true,
          message: 'User updated successfully',
          data: {
            ...initialUsers[0],
            email: 'jane.updated@example.com',
            name: 'Jane Updated',
            firstName: 'Jane',
            middleName: 'K',
            lastName: 'Updated',
            company: null,
          },
        })
      ),
      http.put('*/api/admin/users/2/groups', async ({ request }) => {
        await expect(request.json()).resolves.toEqual({ groupIds: ['10', '11'] })

        return HttpResponse.json({
          success: true,
          message: 'User groups updated successfully',
          data: {
            ...initialUsers[0],
            email: 'jane.updated@example.com',
            name: 'Jane Updated',
            firstName: 'Jane',
            middleName: 'K',
            lastName: 'Updated',
            company: null,
            groups: [
              ...initialUsers[0].groups,
              {
                id: '11',
                name: 'Finance Team',
                description: null,
              },
            ],
          },
        })
      })
    )

    renderUsers()

    await user.click(screen.getByRole('button', { name: 'Edit Jane User' }))
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Jane Updated')
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'jane.updated@example.com')
    await user.clear(screen.getByLabelText('Company'))
    await user.click(screen.getByRole('button', { name: 'Groups' }))
    await user.click(screen.getByRole('option', { name: 'Finance Team' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('User and groups updated successfully')).toBeInTheDocument()
    expect(screen.getByText('jane.updated@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane K Updated')).toBeInTheDocument()
    expect(screen.getByText('No company')).toBeInTheDocument()
    expect(screen.getByText('Support Team, Finance Team')).toBeInTheDocument()
  })
})
