import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import CustomersList from '@/components/CustomersList'

vi.mock('next/navigation', () => ({
  usePathname: () => '/customers',
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

describe('CustomersList', () => {
  it('renders customer cards on mobile and keeps the table for desktop', () => {
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
    const mobileList = screen.getByTestId('customer-mobile-list')
    const desktopTable = screen.getByTestId('customer-desktop-table')

    expect(within(mobileList).getByText('Acme')).toBeInTheDocument()
    expect(within(mobileList).getByText('Acme Corp')).toBeInTheDocument()
    expect(within(mobileList).getByText('acme@example.com')).toBeInTheDocument()
    expect(within(mobileList).getByText('+1-111')).toBeInTheDocument()
    expect(within(mobileList).getAllByText('Mar 1, 2026')).toHaveLength(2)
    expect(within(mobileList).getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
    expect(within(mobileList).getAllByRole('button', { name: 'Delete' })).toHaveLength(2)
    expect(within(desktopTable).getByRole('columnheader', { name: 'Company' })).toBeInTheDocument()
    expect(within(desktopTable).getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
  })

  it('uses the mobile card edit action to open the customer form', () => {
    render(
      <CustomersList
        data={{
          total: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          filters: { name: '', company: '', email: '' },
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
          ],
        }}
      />
    )

    fireEvent.click(within(screen.getByTestId('customer-mobile-list')).getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('heading', { name: 'Edit customer' })).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toHaveValue('+1-111')
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
