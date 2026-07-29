'use client'

import { useState } from 'react'
import { AdminRoleSummary, AdminUserSummary } from '@saas/shared-types'
import RoleManagement from '@/components/admin/RoleManagement'
import UserManagement from '@/components/admin/UserManagement'

interface AdminManagementTabsProps {
  initialRoles: AdminRoleSummary[]
  initialUsers: AdminUserSummary[]
}

type AdminTab = 'roles' | 'users'

export default function AdminManagementTabs({ initialRoles, initialUsers }: AdminManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('roles')

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg shadow p-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              activeTab === 'roles'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('roles')}
          >
            Roles
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            type="button"
            className="rounded-md px-4 py-2 text-sm font-semibold text-gray-400"
            disabled
          >
            Modules
          </button>
        </div>
      </div>

      {activeTab === 'roles' ? (
        <RoleManagement initialRoles={initialRoles} />
      ) : (
        <UserManagement initialUsers={initialUsers} />
      )}
    </div>
  )
}
