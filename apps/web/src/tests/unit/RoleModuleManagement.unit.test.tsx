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
    groupCount: 1,
    moduleCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'Support',
    description: null,
    groupCount: 0,
    moduleCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

const initialModules: AdminModuleSummary[] = [
  {
    id: '10',
    parentModuleId: null,
    parentModuleLabel: null,
    label: 'Analytics',
    displayOrder: 1,
    icon: null,
    href: '/analytics',
    childModuleCount: 0,
    childModules: [],
    subModules: [
      {
        id: '101',
        moduleId: '10',
        label: 'Campaigns',
        displayOrder: 1,
        icon: null,
        href: '/analytics/campaigns',
      },
    ],
  },
  {
    id: '11',
    parentModuleId: null,
    parentModuleLabel: null,
    label: 'Billing',
    displayOrder: 2,
    icon: null,
    href: '/billing',
    childModuleCount: 0,
    childModules: [],
    subModules: [
      {
        id: '111',
        moduleId: '11',
        label: 'Invoices',
        displayOrder: 1,
        icon: null,
        href: '/billing/invoices',
      },
    ],
  },
  {
    id: '12',
    parentModuleId: null,
    parentModuleLabel: null,
    label: 'Settings',
    displayOrder: 3,
    icon: null,
    href: null,
    childModuleCount: 0,
    childModules: [],
    subModules: [],
  },
  {
    id: '13',
    parentModuleId: null,
    parentModuleLabel: null,
    label: 'Marketing',
    displayOrder: 4,
    icon: null,
    href: '/marketing',
    childModuleCount: 1,
    childModules: [
      {
        id: '131',
        parentModuleId: '13',
        label: 'Campaign Studio',
        displayOrder: 1,
        icon: null,
        href: '/marketing/campaigns',
      },
    ],
    subModules: [],
  },
  {
    id: '14',
    parentModuleId: null,
    parentModuleLabel: null,
    label: 'Admin',
    displayOrder: 5,
    icon: null,
    href: '/admin',
    childModuleCount: 1,
    childModules: [
      {
        id: '141',
        parentModuleId: '14',
        label: 'Roles',
        displayOrder: 1,
        icon: null,
        href: '/admin/roles',
      },
    ],
    subModules: [
      {
        id: '1401',
        moduleId: '14',
        label: 'Roles',
        displayOrder: 1,
        icon: null,
        href: '/admin/roles',
      },
    ],
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
    const user = userEvent.setup()
    mockRoleMapping('2', [], ['101'])

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    expect(
      await screen.findByRole('checkbox', { name: 'Analytics module access for Manager' })
    ).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Analytics' }))
    expect(
      screen.getByRole('checkbox', { name: 'Campaigns sub-module access for Manager' })
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Billing module access for Manager' })
    ).not.toBeChecked()
  })

  it('translates migrated legacy sub-module mappings to hierarchical child modules', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], ['1401'])
    server.use(
      http.put('*/api/admin/roles/2/modules', async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          moduleIds: ['14', '141'],
          subModuleIds: [],
        })

        return HttpResponse.json({
          success: true,
          message: 'Role module access updated successfully',
          data: {
            roleId: '2',
            moduleIds: ['14', '141'],
            subModuleIds: [],
          },
        })
      })
    )

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    expect(
      await screen.findByRole('checkbox', { name: 'Admin module access for Manager' })
    ).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Admin' }))
    expect(
      screen.getByRole('checkbox', { name: 'Roles sub-module access for Manager' })
    ).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Role module access updated successfully')).toBeInTheDocument()
  })

  it('renders hierarchical child modules under their parent module', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    await screen.findByRole('checkbox', { name: 'Marketing module access for Manager' })
    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Marketing' }))

    expect(
      screen.getByRole('checkbox', { name: 'Campaign Studio sub-module access for Manager' })
    ).toBeInTheDocument()
    expect(screen.getByText('/marketing/campaigns')).toBeInTheDocument()
  })

  it('does not duplicate legacy sub-modules when hierarchical child modules exist', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    await screen.findByRole('checkbox', { name: 'Admin module access for Manager' })
    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Admin' }))

    expect(
      screen.getAllByRole('checkbox', { name: 'Roles sub-module access for Manager' })
    ).toHaveLength(1)
  })

  it('keeps sub-modules collapsed until the module is expanded', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    await screen.findByRole('checkbox', { name: 'Analytics module access for Manager' })
    expect(
      screen.queryByRole('checkbox', { name: 'Campaigns sub-module access for Manager' })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Analytics' }))

    expect(
      screen.getByRole('checkbox', { name: 'Campaigns sub-module access for Manager' })
    ).toBeInTheDocument()
  })

  it('auto-selects all children when a parent is selected and clears them when unchecked', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    const billingCheckbox = await screen.findByRole('checkbox', {
      name: 'Billing module access for Manager',
    })
    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Billing' }))
    const invoicesCheckbox = screen.getByRole('checkbox', {
      name: 'Invoices sub-module access for Manager',
    })

    await user.click(billingCheckbox)

    expect(billingCheckbox).toBeChecked()
    expect(invoicesCheckbox).toBeChecked()

    await user.click(billingCheckbox)

    expect(billingCheckbox).not.toBeChecked()
    expect(invoicesCheckbox).not.toBeChecked()
  })

  it('auto-selects hierarchical child modules when a parent is selected', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    const marketingCheckbox = await screen.findByRole('checkbox', {
      name: 'Marketing module access for Manager',
    })
    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Marketing' }))
    const campaignStudioCheckbox = screen.getByRole('checkbox', {
      name: 'Campaign Studio sub-module access for Manager',
    })

    await user.click(marketingCheckbox)

    expect(marketingCheckbox).toBeChecked()
    expect(campaignStudioCheckbox).toBeChecked()
  })

  it('saves normalized ids and updates local module count after success', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])
    server.use(
      http.put('*/api/admin/roles/2/modules', async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          moduleIds: ['10', '11'],
          subModuleIds: ['101', '111'],
        })

        return HttpResponse.json({
          success: true,
          message: 'Role module access updated successfully',
          data: {
            roleId: '2',
            moduleIds: ['10', '11'],
            subModuleIds: ['101', '111'],
          },
        })
      })
    )

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    await screen.findByRole('checkbox', { name: 'Billing module access for Manager' })
    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Billing' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Invoices sub-module access for Manager' })
    )
    await user.click(screen.getByRole('checkbox', { name: 'Analytics module access for Manager' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Role module access updated successfully')).toBeInTheDocument()
    expect(screen.getByText('2 modules')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Analytics module access for Manager' })
    ).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Analytics' }))
    expect(
      screen.getByRole('checkbox', { name: 'Campaigns sub-module access for Manager' })
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
    await user.click(screen.getByRole('button', { name: 'Save' }))

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
    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Billing' }))
    const invoicesCheckbox = screen.getByRole('checkbox', {
      name: 'Invoices sub-module access for Manager',
    })

    expect(analyticsCheckbox).toBeChecked()
    expect(billingCheckbox).toBeChecked()
    expect(invoicesCheckbox).toBeChecked()

    await user.click(analyticsCheckbox)
    await user.click(billingCheckbox)
    await user.click(screen.getByRole('button', { name: 'Save' }))

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

    await user.click(screen.getByRole('button', { name: /Support/ }))

    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: 'Billing module access for Support' })
      ).toBeChecked()
    })
    await user.click(screen.getByRole('button', { name: 'Show sub-modules for Billing' }))
    expect(
      screen.getByRole('checkbox', { name: 'Invoices sub-module access for Support' })
    ).toBeChecked()
  })

  it('filters roles as the user types', async () => {
    const user = userEvent.setup()
    mockRoleMapping('2', [], [])

    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />)

    await screen.findByRole('button', { name: /Manager/ })
    await user.type(screen.getByLabelText('Roles'), 'sup')

    expect(screen.queryByRole('button', { name: /Manager/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Support/ })).toBeInTheDocument()
  })

  it('shows empty states without inventing roles or modules', () => {
    const view = render(<RoleModuleManagement initialRoles={[]} initialModules={initialModules} />)

    expect(screen.getByText('No roles have been created yet.')).toBeInTheDocument()
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument()

    view.unmount()
    mockRoleMapping('2', [], [])
    render(<RoleModuleManagement initialRoles={initialRoles} initialModules={[]} />)

    expect(screen.getByText('No modules are available.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
