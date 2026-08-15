'use client'

import { FormEvent, useState } from 'react'
import { ApiResponse, Customer, CustomerMutationRequest, CustomersResponse } from '@saas/shared-types'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface CustomersListProps {
  data: CustomersResponse
}

type CustomerFormState = CustomerMutationRequest

const emptyCustomerForm: CustomerFormState = {
  name: '',
  company: '',
  email: '',
  phone: '',
  status: 'active',
}

function getBffUrl(): string {
  return process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'
}

export default function CustomersList({ data }: CustomersListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { customers, total, page, pageSize, totalPages, filters } = data
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [formState, setFormState] = useState<CustomerFormState>(emptyCustomerForm)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const getStatusColor = (status: Customer['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const updateQuery = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`${pathname}?${params.toString()}`)
  }

  const refreshCustomers = () => {
    router.refresh()
  }

  const startAdd = () => {
    setEditingCustomerId(null)
    setFormState(emptyCustomerForm)
    setIsFormOpen(true)
    setMessage(null)
    setError(null)
  }

  const startEdit = (customer: Customer) => {
    setEditingCustomerId(customer.id)
    setFormState({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
    })
    setIsFormOpen(true)
    setMessage(null)
    setError(null)
  }

  const submitCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch(
        `${getBffUrl()}/api/customers${editingCustomerId ? `/${editingCustomerId}` : ''}`,
        {
          method: editingCustomerId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formState),
        }
      )
      const payload = (await response.json()) as ApiResponse<Customer>

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to save customer')
      }

      setMessage(payload.message ?? (editingCustomerId ? 'Customer updated' : 'Customer created'))
      setIsFormOpen(false)
      setEditingCustomerId(null)
      setFormState(emptyCustomerForm)
      refreshCustomers()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save customer')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteCustomer = async (customer: Customer) => {
    setMessage(null)
    setError(null)

    try {
      const response = await fetch(`${getBffUrl()}/api/customers/${customer.id}`, {
        method: 'DELETE',
      })
      const payload = (await response.json()) as ApiResponse<Customer>

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to delete customer')
      }

      setMessage(payload.message ?? 'Customer deleted')
      refreshCustomers()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete customer')
    }
  }

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRecord = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      <form
        className="bg-white rounded-lg shadow p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          updateQuery({
            name: String(formData.get('name') ?? '').trim(),
            company: String(formData.get('company') ?? '').trim(),
            email: String(formData.get('email') ?? '').trim(),
            page: '1',
            pageSize: pageSize.toString(),
          })
        }}
      >
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto] lg:items-end">
          <div>
            <label htmlFor="customer-name-search" className="block text-sm font-semibold text-gray-700">
              Name
            </label>
            <input
              id="customer-name-search"
              name="name"
              type="search"
              defaultValue={filters.name}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Customer name"
            />
          </div>
          <div>
            <label htmlFor="customer-company-search" className="block text-sm font-semibold text-gray-700">
              Company
            </label>
            <input
              id="customer-company-search"
              name="company"
              type="search"
              defaultValue={filters.company}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Company"
            />
          </div>
          <div>
            <label htmlFor="customer-email-search" className="block text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              id="customer-email-search"
              name="email"
              type="search"
              defaultValue={filters.email}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Email"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Search
          </button>
          <button
            type="button"
            className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            onClick={startAdd}
          >
            Add
          </button>
        </div>
      </form>

      {isFormOpen && (
        <form className="bg-white rounded-lg shadow p-4 sm:p-5" onSubmit={submitCustomer}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              {editingCustomerId ? 'Edit customer' : 'Add customer'}
            </h3>
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label htmlFor="customer-name" className="block text-sm font-semibold text-gray-700">
                Name
              </label>
              <input
                id="customer-name"
                value={formState.name}
                onChange={(event) => setFormState((state) => ({ ...state, name: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                required
              />
            </div>
            <div>
              <label htmlFor="customer-company" className="block text-sm font-semibold text-gray-700">
                Company
              </label>
              <input
                id="customer-company"
                value={formState.company}
                onChange={(event) => setFormState((state) => ({ ...state, company: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                required
              />
            </div>
            <div>
              <label htmlFor="customer-email" className="block text-sm font-semibold text-gray-700">
                Email
              </label>
              <input
                id="customer-email"
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((state) => ({ ...state, email: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                required
              />
            </div>
            <div>
              <label htmlFor="customer-phone" className="block text-sm font-semibold text-gray-700">
                Phone
              </label>
              <input
                id="customer-phone"
                value={formState.phone}
                onChange={(event) => setFormState((state) => ({ ...state, phone: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                required
              />
            </div>
            <div>
              <label htmlFor="customer-status" className="block text-sm font-semibold text-gray-700">
                Status
              </label>
              <select
                id="customer-status"
                value={formState.status}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    status: event.target.value as Customer['status'],
                  }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {isSaving ? 'Saving...' : 'Save customer'}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            All Customers ({total})
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700" htmlFor="records-per-page">
              Records per page
              <select
                id="records-per-page"
                value={pageSize}
                onChange={(event) =>
                  updateQuery({
                    name: filters.name,
                    company: filters.company,
                    email: filters.email,
                    page: '1',
                    pageSize: event.target.value,
                  })
                }
                className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
              </select>
            </label>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page <= 1}
                onClick={() =>
                  updateQuery({
                    name: filters.name,
                    company: filters.company,
                    email: filters.email,
                    page: Math.max(page - 1, 1).toString(),
                    pageSize: pageSize.toString(),
                  })
                }
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() =>
                  updateQuery({
                    name: filters.name,
                    company: filters.company,
                    email: filters.email,
                    page: Math.min(page + 1, totalPages).toString(),
                    pageSize: pageSize.toString(),
                  })
                }
              >
                Next
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Showing {startRecord}-{endRecord} of {total}
        </p>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[13%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="truncate text-sm font-medium text-gray-900" title={customer.name}>
                    {customer.name}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="truncate text-sm text-gray-900" title={customer.company}>
                    {customer.company}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="truncate text-sm text-gray-600" title={customer.email}>
                    {customer.email}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="truncate text-sm text-gray-600" title={customer.phone}>
                    {customer.phone}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                    {customer.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {formatDate(customer.createdAt)}
                </td>
                <td className="px-4 py-4 text-right text-sm">
                  <button
                    type="button"
                    className="font-semibold text-indigo-600 hover:text-indigo-500"
                    onClick={() => startEdit(customer)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ml-2 font-semibold text-red-600 hover:text-red-500"
                    onClick={() => void deleteCustomer(customer)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {customers.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No customers found.</p>
        </div>
      )}
      </div>
    </div>
  )
}
