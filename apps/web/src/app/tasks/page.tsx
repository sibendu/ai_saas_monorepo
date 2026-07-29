import { TasksResponse } from '@saas/shared-types'
import AppShell from '@/components/AppShell'
import TaskList from '@/components/TaskList'
import { getAuthenticatedShellData } from '@/lib/role-menu'

async function getTasks(): Promise<TasksResponse | null> {
  try {
    const bffUrl = process.env.BFF_INTERNAL_URL || process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'

    const response = await fetch(`${bffUrl}/api/tasks`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Failed to fetch tasks:', response.statusText)
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return null
  }
}

export default async function TasksPage() {
  const { session, menuSections, menuLayout } = await getAuthenticatedShellData()

  const tasksData = await getTasks()

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Task List"
      pageSubtitle="Web and mobile friendly task tracking view"
    >
      {tasksData ? (
        <TaskList tasks={tasksData.tasks} total={tasksData.total} />
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600">Failed to load tasks. Please try again later.</p>
        </div>
      )}
    </AppShell>
  )
}
