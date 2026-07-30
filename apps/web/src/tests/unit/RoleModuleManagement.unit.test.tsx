import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/tests/msw/server'
import RoleModuleManagement from '@/components/admin/RoleModuleManagement'
import type { AdminModuleSummary, AdminRoleSummary } from '@saas/shared-types'

const initialRoles: AdminRoleSummary[] = [
  {
    id: '2',
    name: 'Manager',
    description: 'Manager access',
    userCount: 1,
    moduleCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'Support',
    description: null,
    userCount: 0,
    moduleCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

const initialModules: AdminModuleSummary[] = [
  {
    id: '10',
    label: 'Analytics',
    icon: null,
    href: '/analytics',
    subModules: [
      {
        id: '101',
        moduleId: '10',
        label: 'Campaigns',
        icon: null,
        href: '/analytics/campaigns',
      },
    ],
  },
  {
    id: '11',
    label: 'Billing',
    icon: null,
    href: '/billing',
    subModules: [
      {
        id: '111',
        moduleId: '11',
        label: 'Invoices',
        icon: null,
        href: '/billing/invoices',
      },
    ],
  },
  {
    id: '12',
    label: 'Settings',
    icon: null,
    href: null,
    subModules: [],
  },
]

function mockRoleMapping(roleId: string, moduleIds: string[], subModuleIds: string[]) {
  server.use(
    http.get(`*/api/admin/roles/${roleId}/modules`, async () =>
      HttpResponse.json({
        success: true,
        data: {
          roleId,
          moduleIds,
          subModuleIds,
        },
      })
    )
  )
}

describe('RoleModuleManagement', () => {
  it('loads persisted mapping for the selected role into checkboxes', async () => {
    mockRoleMapping('2', ['10'], ['101'])

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    expect(
      await screen.findByRole('checkbox', { name: 'Analytics module access for Manager' })
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Campaigns sub-module access for Manager' })
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Billing module access for Manager' })
    ).not.toBeChecked()
  })

  it('auto-selects parents for selected children and clears children when a parent is unchecked', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    const billingCheckbox = await screen.findByRole('checkbox', {
      name: 'Billing module access for Manager',
    })
    const invoicesCheckbox = screen.getByRole('checkbox', {
      name: 'Invoices sub-module access for Manager',
    })

    await user.click(invoicesCheckbox)

    expect(billingCheckbox).toBeChecked()
    expect(invoicesCheckbox).toBeChecked()

    await user.click(billingCheckbox)

    expect(billingCheckbox).not.toBeChecked()
    expect(invoicesCheckbox).not.toBeChecked()
  })

  it('saves normalized ids and updates local module count after success', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])
    server.use(
      http.put('*/api/admin/roles/2/modules', async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          moduleIds: ['10', '11'],
          subModuleIds: ['111'],
        })

        return HttpResponse.json({
          success: true,
          message: 'Role module access updated successfully',
          data: {
            roleId: '2',
            moduleIds: ['10', '11'],
            subModuleIds: ['111'],
          },
        })
      })
    )

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    await user.click(
      await screen.findByRole('checkbox', { name: 'Invoices sub-module access for Manager' })
    )
    await user.click(screen.getByRole('checkbox', { name: 'Analytics module access for Manager' }))
    await user.click(screen.getByRole('button', { name: 'Save access' }))

    expect(await screen.findByText('Role module access updated successfully')).toBeInTheDocument()
    expect(screen.getByText('2 modules')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Analytics module access for Manager' })
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Invoices sub-module access for Manager' })
    ).toBeChecked()
  })

  it('keeps edited selections visible when the API returns an error', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])
    server.use(
      http.put('*/api/admin/roles/2/modules', async () =>
        HttpResponse.json(
          {
            success: false,
            error: 'Admin role must retain module access',
          },
          { status: 409 }
        )
      )
    )

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    const analyticsCheckbox = await screen.findByRole('checkbox', {
      name: 'Analytics module access for Manager',
    })

    await user.click(analyticsCheckbox)
    await user.click(screen.getByRole('button', { name: 'Save access' }))

    expect(await screen.findByText('Admin role must retain module access')).toBeInTheDocument()
    expect(analyticsCheckbox).toBeChecked()
    expect(screen.getByText('0 modules')).toBeInTheDocument()
  })

  it('clears a non-Admin role and saves an empty mapping', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', ['10', '11'], ['111'])
    server.use(
      http.put('*/api/admin/roles/2/modules', async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          moduleIds: [],
          subModuleIds: [],
        })

        return HttpResponse.json({
          success: true,
          message: 'Role module access updated successfully',
          data: {
            roleId: '2',
            moduleIds: [],
            subModuleIds: [],
          },
        })
      })
    )

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    const analyticsCheckbox = await screen.findByRole('checkbox', {
      name: 'Analytics module access for Manager',
    })
    const billingCheckbox = screen.getByRole('checkbox', {
      name: 'Billing module access for Manager',
    })
    const invoicesCheckbox = screen.getByRole('checkbox', {
      name: 'Invoices sub-module access for Manager',
    })

    expect(analyticsCheckbox).toBeChecked()
    expect(billingCheckbox).toBeChecked()
    expect(invoicesCheckbox).toBeChecked()

    await user.click(analyticsCheckbox)
    await user.click(billingCheckbox)
    await user.click(screen.getByRole('button', { name: 'Save access' }))

    expect(await screen.findByText('Role module access updated successfully')).toBeInTheDocument()
    expect(analyticsCheckbox).not.toBeChecked()
    expect(billingCheckbox).not.toBeChecked()
    expect(invoicesCheckbox).not.toBeChecked()
    expect(screen.getAllByText('0 modules').length).toBeGreaterThan(0)
  })

  it('fetches mapping when a different role is selected', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])
    mockRoleMapping('3', ['11'], ['111'])

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    expect(
      await screen.findByRole('checkbox', { name: 'Billing module access for Manager' })
    ).not.toBeChecked()

    await user.selectOptions(screen.getByLabelText('Role'), '3')

    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: 'Billing module access for Support' })
      ).toBeChecked()
    })
    expect(
      screen.getByRole('checkbox', { name: 'Invoices sub-module access for Support' })
    ).toBeChecked()
  })

  it('shows empty states without inventing roles or modules', () => {
    const view = render(<RoleModuleManagement initialRoles={[]} initialModules={initialModules} />)

    expect(screen.getByText('No roles have been created yet.')).toBeInTheDocument()
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument()

    view.unmount()
    mockRoleMapping('2', [], [])
    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={[]} />)

    expect(screen.getByText('No modules are available.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save access' })).toBeDisabled()
  })
})
