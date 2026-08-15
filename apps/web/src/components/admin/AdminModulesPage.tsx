'use client'

import { useState } from 'react'
import { AdminModuleSummary } from '@saas/shared-types'
import ModuleManagement from '@/components/admin/ModuleManagement'

interface AdminModulesPageProps {
  initialModules: AdminModuleSummary[]
}

export default function AdminModulesPage({ initialModules }: AdminModulesPageProps) {
  const [modules, setModules] = useState<AdminModuleSummary[]>(initialModules)

  return <ModuleManagement initialModules={modules} onModulesChange={setModules} />
}
