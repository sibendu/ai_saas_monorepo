import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CustomersList from '@/components/CustomersList'

vi.mock('next/navigation', () => ({
  usePathname: () => '/customers',
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

describe('CustomersList', () => {
  it('renders customer rows and total count', () => {
    render(
      <CustomersList
        data={{
          total: 2,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          filters: {
            name: '',
            company: '',
            email: '',
          },
          customers: [
            {
              id: '1',
              name: 'Acme',
              email: 'acme@example.com',
              company: 'Acme Corp',
              phone: '+1-111',
              status: 'active',
              createdAt: '2026-03-01T00:00:00Z',
            },
            {
              id: '2',
              name: 'Beta',
              email: 'beta@example.com',
              company: 'Beta Inc',
              phone: '+1-222',
              status: 'pending',
              createdAt: '2026-03-01T00:00:00Z',
            },
          ],
        }}
      />
    )

    expect(screen.getByText('All Customers (2)')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Company')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.getByLabelText('Records per page')).toHaveValue('10')
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('acme@example.com')).toBeInTheDocument()
    expect(screen.getByText('beta@example.com')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2)
  })

  it('shows empty-state text when there are no customers', () => {
    render(
      <CustomersList
        data={{
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          filters: {
            name: '',
            company: '',
            email: '',
          },
          customers: [],
        }}
      />
    )

    expect(screen.getByText('No customers found.')).toBeInTheDocument()
  })
})
