'use client'

import { useState } from 'react'
import { AdminModuleSummary, AdminRoleSummary, AdminUserSummary } from '@saas/shared-types'
import AuditLogViewer from '@/components/admin/AuditLogViewer'
import ModuleManagement from '@/components/admin/ModuleManagement'
import RoleManagement from '@/components/admin/RoleManagement'
import RoleModuleManagement from '@/components/admin/RoleModuleManagement'
import StyleManagement from '@/components/admin/StyleManagement'
import UserManagement from '@/components/admin/UserManagement'

interface AdminManagementTabsProps {
  initialRoles: AdminRoleSummary[]
  initialUsers: AdminUserSummary[]
  initialModules: AdminModuleSummary[]
}

type AdminTab = 'roles' | 'users' | 'module-management' | 'modules' | 'style' | 'logs'

export default function AdminManagementTabs({
  initialRoles,
  initialUsers,
  initialModules,
}: AdminManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('roles')
  const [modules, setModules] = useState<AdminModuleSummary[]>(initialModules)

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
              activeTab === 'module-management'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('module-management')}
          >
            Modules
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
            Role-Module
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              activeTab === 'style'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('style')}
          >
            Style
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
      {activeTab === 'module-management' && (
        <ModuleManagement initialModules={modules} onModulesChange={setModules} />
      )}
      {activeTab === 'modules' && (
        <RoleModuleManagement initialRoles={initialRoles} initialModules={modules} />
      )}
      {activeTab === 'style' && <StyleManagement />}
      {activeTab === 'logs' && <AuditLogViewer />}
    </div>
  )
}
