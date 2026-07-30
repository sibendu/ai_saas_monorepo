'use client'

import { AdminModuleSummary, AdminRoleSummary } from '@saas/shared-types'

interface RoleModuleManagementProps {
  initialRoles: AdminRoleSummary[]
  initialModules: AdminModuleSummary[]
}

export default function RoleModuleManagement({
  initialRoles,
  initialModules,
}: RoleModuleManagementProps) {
  return (
    <section className="space-y-5">
      <div className="bg-white rounded-lg shadow p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-gray-900">Role module access</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select a role to review its available module hierarchy.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Roles</h3>
          {initialRoles.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No roles have been created yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {initialRoles.map((role) => (
                <li key={role.id} className="py-3">
                  <p className="text-sm font-medium text-gray-900">{role.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{role.moduleCount} modules</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Module hierarchy
          </h3>
          {initialModules.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No modules are available.</p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {initialModules.map((module) => (
                <li key={module.id} className="py-3">
                  <p className="text-sm font-medium text-gray-900">{module.label}</p>
                  {module.subModules.length > 0 ? (
                    <ul className="mt-2 space-y-1 pl-4">
                      {module.subModules.map((subModule) => (
                        <li key={subModule.id} className="text-sm text-gray-600">
                          {subModule.label}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No sub-modules</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
