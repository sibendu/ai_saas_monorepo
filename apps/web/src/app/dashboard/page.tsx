import AppShell from '@/components/AppShell'
import { getAuthenticatedShellData } from '@/lib/role-menu'
import { DashboardData, DashboardRequest } from '@saas/shared-types'

async function getDashboardData(user: DashboardRequest['user']): Promise<DashboardData | null> {
  try {
    const bffUrl = process.env.BFF_INTERNAL_URL || process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'

    const response = await fetch(`${bffUrl}/api/dashboard`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user } satisfies DashboardRequest),
    })

    if (!response.ok) {
      console.error('Failed to fetch dashboard:', response.statusText)
      return null
    }

    return (await response.json()) as DashboardData
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return null
  }
}

export default async function DashboardPage() {
  const { session, menuSections, menuLayout } = await getAuthenticatedShellData()

  const dashboardData = await getDashboardData({
    email: session.user?.email || '',
    name: session.user?.name,
  })

  if (!dashboardData) {
    return (
      <AppShell
        user={session.user}
        menuSections={menuSections}
        menuLayout={menuLayout}
        pageTitle="Dashboard"
        pageSubtitle="Analytics overview with cross-filter style layout"
      >
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600">Failed to load dashboard data. Please try again later.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Dashboard"
      pageSubtitle="Analytics overview with cross-filter style layout"
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">{dashboardData.welcomeMessage}</h2>
              <p className="text-sm text-gray-500 mt-1">Here’s a quick snapshot of your business performance.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-2 rounded-md text-sm font-medium bg-indigo-100 text-indigo-800">Last 7 days</button>
              <button className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">Last 30 days</button>
              <button className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">Quarter</button>
              <button className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">All channels</button>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {dashboardData.kpiCards.map((card) => (
            <div key={card.label} className="bg-white rounded-lg shadow p-4 sm:p-5">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
              <p className={`text-sm mt-2 ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{card.delta} vs previous period</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white rounded-lg shadow p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Revenue Trend</h3>
              <span className="text-xs sm:text-sm text-gray-500">Monthly</span>
            </div>

            <div className="h-56 sm:h-64 flex items-end gap-2 sm:gap-3">
              {dashboardData.revenueSeries.map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end gap-2">
                  <div
                    className="w-full bg-indigo-400 hover:bg-indigo-500 rounded-t transition-colors"
                    style={{ height: `${value}%` }}
                  />
                  <span className="text-[10px] sm:text-xs text-gray-400">M{index + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Traffic Channels</h3>
              <span className="text-xs sm:text-sm text-gray-500">Share</span>
            </div>

            <div className="space-y-4">
              {dashboardData.channelBreakdown.map((channel) => (
                <div key={channel.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{channel.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{channel.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-indigo-400" style={{ width: `${channel.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Top Campaigns</h3>
            <span className="text-xs sm:text-sm text-gray-500">Performance</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                  <th className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Spend</th>
                  <th className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.topCampaigns.map((campaign) => (
                  <tr key={campaign.name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-3 pr-4 text-sm font-medium text-gray-900">{campaign.name}</td>
                    <td className="py-3 pr-4 text-sm text-gray-700">{campaign.spend}</td>
                    <td className="py-3 pr-4 text-sm text-green-700 font-semibold">{campaign.roas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
