import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/tests/msw/server'
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
    server.use(
      http.get('*/api/admin/roles/1/modules', async () =>
        HttpResponse.json({
          success: true,
          data: {
            roleId: '1',
            moduleIds: ['3'],
            subModuleIds: ['4'],
          },
        })
      ),
      http.get('*/api/admin/audit-logs', async () =>
        HttpResponse.json({
          success: true,
          data: {
            logs: [
              {
                id: '1',
                actorCustomerId: '1',
                actorEmail: 'admin@example.com',
                action: 'ROLE_UPDATED',
                entityType: 'ROLE',
                entityId: '1',
                entityLabel: 'Manager',
                targetCustomerId: null,
                targetRoleId: '1',
                metadata: { changedFields: ['description'] },
                createdAt: '2026-01-01T00:00:00.000Z',
              },
            ],
            nextCursor: null,
            totalCount: 1,
          },
        })
      ),
      http.get('*/api/admin/style', async () =>
        HttpResponse.json({
          success: true,
          data: {
            activeStyle: 'custom',
            styles: [
              {
                name: 'light',
                label: 'Light',
                description: 'Bright neutral interface for everyday work.',
                href: '/theme-light.css',
                swatches: ['#4f46e5', '#ffffff', '#f9fafb'],
              },
              {
                name: 'dark',
                label: 'Dark',
                description: 'Low-light interface with deep surfaces and vivid accents.',
                href: '/theme-dark.css',
                swatches: ['#818cf8', '#1e293b', '#0f172a'],
              },
              {
                name: 'custom',
                label: 'Custom',
                description: 'Production custom theme with blue header and teal navigation.',
                href: '/theme-custom.css',
                swatches: ['#0b5ed7', '#0d7486', '#f1f5f9'],
              },
            ],
          },
        })
      )
    )

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
    const roleModulesTab = screen.getByRole('button', { name: 'Role-Module' })
    const styleTab = screen.getByRole('button', { name: 'Style' })
    const logsTab = screen.getByRole('button', { name: 'Logs' })

    expect(rolesTab).toHaveClass('bg-indigo-600', 'text-white')
    expect(usersTab).toHaveClass('text-gray-700', 'hover:bg-gray-100')
    expect(modulesTab).toBeEnabled()
    expect(modulesTab).toHaveClass('text-gray-700', 'hover:bg-gray-100')
    expect(roleModulesTab).toBeEnabled()
    expect(styleTab).toBeEnabled()
    expect(logsTab).toBeEnabled()

    await user.click(usersTab)

    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('No roles assigned')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Manager for Jane User' })).not.toBeChecked()
    expect(usersTab).toHaveClass('bg-indigo-600', 'text-white')
    expect(modulesTab).toHaveClass('text-gray-700', 'hover:bg-gray-100')

    await user.click(modulesTab)

    expect(screen.getByRole('heading', { name: 'Modules' })).toBeInTheDocument()
    expect(screen.getByText('Create and maintain modules used by role access mapping.')).toBeInTheDocument()
    expect(screen.getByText('/analytics')).toBeInTheDocument()
    expect(modulesTab).toHaveClass('bg-indigo-600', 'text-white')

    await user.click(roleModulesTab)

    expect(screen.getByRole('heading', { name: 'Role-Module' })).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Campaigns')).toBeInTheDocument()
    expect(roleModulesTab).toHaveClass('bg-indigo-600', 'text-white')
    expect(rolesTab).toHaveClass('text-gray-700', 'hover:bg-gray-100')

    await user.click(rolesTab)

    expect(screen.getByText('Manager access')).toBeInTheDocument()

    await user.click(styleTab)

    expect(await screen.findByRole('heading', { name: 'Style' })).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Applied' })).toBeDisabled()

    await user.click(logsTab)

    expect(await screen.findByRole('heading', { name: 'Audit logs' })).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('Role updated').length).toBeGreaterThan(0)
  })
})
