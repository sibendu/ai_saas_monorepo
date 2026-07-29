import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/tests/msw/server'
import RoleManagement from '@/components/admin/RoleManagement'

const initialRoles = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full access',
    userCount: 1,
    moduleCount: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

describe('RoleManagement', () => {
  it('creates a role and adds it to the table', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/admin/roles', async () =>
        HttpResponse.json(
          {
            success: true,
            message: 'Role created successfully',
            data: {
              id: '2',
              name: 'Support',
              description: 'Support desk access',
              userCount: 0,
              moduleCount: 0,
              createdAt: '2026-01-03T00:00:00.000Z',
              updatedAt: '2026-01-03T00:00:00.000Z',
            },
          },
          { status: 201 }
        )
      )
    )

    render(<RoleManagement initialRoles={initialRoles} />)

    await user.type(screen.getByLabelText('Role name'), 'Support')
    await user.type(screen.getByLabelText('Description'), 'Support desk access')
    await user.click(screen.getByRole('button', { name: 'Add role' }))

    expect(await screen.findByText('Role created successfully')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('Support desk access')).toBeInTheDocument()
  })

  it('shows delete conflict errors from the API', async () => {
    const user = userEvent.setup()
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)
    server.use(
      http.delete('*/api/admin/roles/1', async () =>
        HttpResponse.json(
          {
            success: false,
            error: 'Role cannot be deleted while it has assigned users or module access',
          },
          { status: 409 }
        )
      ),
      http.get('*/api/admin/roles', async () =>
        HttpResponse.json({
          success: true,
          data: {
            roles: initialRoles,
          },
        })
      )
    )

    render(<RoleManagement initialRoles={initialRoles} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(
      await screen.findByText('Role cannot be deleted while it has assigned users or module access')
    ).toBeInTheDocument()
    expect(confirmMock).toHaveBeenCalledWith('Delete role "Admin"?')

    confirmMock.mockRestore()
  })
})
