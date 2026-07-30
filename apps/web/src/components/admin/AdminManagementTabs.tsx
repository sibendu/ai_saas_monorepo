'use client'

import { useState } from 'react'
import { AdminModuleSummary, AdminRoleSummary, AdminUserSummary } from '@saas/shared-types'
import AuditLogViewer from '@/components/admin/AuditLogViewer'
import RoleManagement from '@/components/admin/RoleManagement'
import RoleModuleManagement from '@/components/admin/RoleModuleManagement'
import UserManagement from '@/components/admin/UserManagement'

interface AdminManagementTabsProps {
  initialRoles: AdminRoleSummary[]
  initialUsers: AdminUserSummary[]
  initialModules: AdminModuleSummary[]
}

type AdminTab = 'roles' | 'users' | 'modules' | 'logs'

export default function AdminManagementTabs({
  initialRoles,
  initialUsers,
  initialModules,
}: AdminManagementTabsProps) {
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
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              activeTab === 'modules'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('modules')}
          >
            Modules
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            Logs
          </button>
        </div>
      </div>

      {activeTab === 'roles' && <RoleManagement initialRoles={initialRoles} />}
      {activeTab === 'users' && (
        <UserManagement initialUsers={initialUsers} availableRoles={initialRoles} />
      )}
      {activeTab === 'modules' && (
        <RoleModuleManagement initialRoles={initialRoles} initialModules={initialModules} />
      )}
      {activeTab === 'logs' && <AuditLogViewer />}
    </div>
  )
}
