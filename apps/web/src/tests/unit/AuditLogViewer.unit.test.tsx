import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import AuditLogViewer from '@/components/admin/AuditLogViewer'
import { server } from '@/tests/msw/server'

describe('AuditLogViewer', () => {
  it('loads audit rows read-only and summarizes allowlisted metadata', async () => {
    server.use(
      http.get('*/api/admin/audit-logs', async () =>
        HttpResponse.json({
          success: true,
          data: {
            logs: [
              {
                id: '1',
                actorCustomerId: '1',
                actorEmail: 'admin@example.com',
                action: 'USER_UPDATED',
                entityType: 'CUSTOMER',
                entityId: '2',
                entityLabel: 'Jane User',
                targetCustomerId: '2',
                targetRoleId: null,
                metadata: {
                  changedFields: ['email', 'name'],
                  password: 'should-not-render',
                },
                createdAt: '2026-01-01T00:00:00.000Z',
              },
            ],
            nextCursor: null,
            totalCount: 1,
          },
        })
      )
    )

    render(<AuditLogViewer />)

    expect(screen.getByText('Loading audit logs...')).toBeInTheDocument()
    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('User updated').length).toBeGreaterThan(0)
    expect(screen.getByText('Jane User')).toBeInTheDocument()
    expect(screen.getByText('Changed: email, name')).toBeInTheDocument()
    expect(screen.queryByText('should-not-render')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('applies filters and loads the next page with the cursor', async () => {
    const user = userEvent.setup()
    const requestUrls: string[] = []

    server.use(
      http.get('*/api/admin/audit-logs', async ({ request }) => {
        requestUrls.push(request.url)
        const url = new URL(request.url)
        const cursor = url.searchParams.get('cursor')

        return HttpResponse.json({
          success: true,
          data: {
            logs: cursor
              ? [
                  {
                    id: '1',
                    actorCustomerId: '1',
                    actorEmail: 'admin@example.com',
                    action: 'ROLE_UPDATED',
                    entityType: 'ROLE',
                    entityId: '4',
                    entityLabel: 'Support',
                    targetCustomerId: null,
                    targetRoleId: '4',
                    metadata: { changedFields: ['description'] },
                    createdAt: '2026-01-01T00:00:00.000Z',
                  },
                ]
              : [
                  {
                    id: '2',
                    actorCustomerId: '1',
                    actorEmail: 'admin@example.com',
                    action: 'ROLE_UPDATED',
                    entityType: 'ROLE',
                    entityId: '4',
                    entityLabel: 'Support',
                    targetCustomerId: null,
                    targetRoleId: '4',
                    metadata: { changedFields: ['name'] },
                    createdAt: '2026-01-02T00:00:00.000Z',
                  },
                ],
            nextCursor: cursor ? null : '2',
            totalCount: 2,
          },
        })
      })
    )

    render(<AuditLogViewer />)

    expect(await screen.findByText('Changed: name')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Action'), 'ROLE_UPDATED')
    await user.selectOptions(screen.getByLabelText('Entity'), 'ROLE')
    await user.type(screen.getByLabelText('Actor email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Target role id'), '4')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      const lastRequestUrl = new URL(requestUrls[requestUrls.length - 1] ?? '')

      expect(lastRequestUrl.searchParams.get('action')).toBe('ROLE_UPDATED')
      expect(lastRequestUrl.searchParams.get('entityType')).toBe('ROLE')
      expect(lastRequestUrl.searchParams.get('actorEmail')).toBe('admin@example.com')
      expect(lastRequestUrl.searchParams.get('targetRoleId')).toBe('4')
      expect(lastRequestUrl.searchParams.get('limit')).toBe('25')
    })

    await user.click(await screen.findByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('Changed: description')).toBeInTheDocument()
    expect(new URL(requestUrls[requestUrls.length - 1] ?? '').searchParams.get('cursor')).toBe('2')
  })

  it('renders empty and API error states without audit mutation controls', async () => {
    const user = userEvent.setup()

    server.use(
      http.get('*/api/admin/audit-logs', async ({ request }) => {
        const url = new URL(request.url)

        if (url.searchParams.get('actorEmail') === 'error@example.com') {
          return HttpResponse.json(
            { success: false, error: 'Invalid actor email filter' },
            { status: 400 }
          )
        }

        return HttpResponse.json({
          success: true,
          data: {
            logs: [],
            nextCursor: null,
            totalCount: 0,
          },
        })
      })
    )

    render(<AuditLogViewer />)

    expect(
      await screen.findByText('No audit logs match the current filters.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Actor email'), 'error@example.com')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('Invalid actor email filter')).toBeInTheDocument()
  })
})
