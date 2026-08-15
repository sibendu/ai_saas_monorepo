import AppShell from '@/components/AppShell'
import { getAuthenticatedShellData } from '@/lib/role-menu'
import { DashboardData, DashboardRequest } from '@saas/shared-types'

const chartMonthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const rupeeSymbol = '₹'

type DashboardRevenueSummary = DashboardData['revenueSummary']
type DashboardPayload = Omit<DashboardData, 'revenueSummary'> & {
  revenueSummary?: DashboardRevenueSummary
}

function formatRupeeCurrency(value: string): string {
  return value.replace(/\$/g, rupeeSymbol)
}

function getChartPoint(value: number, index: number, series: number[]) {
  const width = 640
  const height = 220
  const paddingX = 54
  const paddingY = 24
  const maxValue = Math.max(...series, 1)
  const minValue = Math.min(...series, 0)
  const valuePadding = Math.max((maxValue - minValue) * 0.18, 8)
  const chartMax = maxValue + valuePadding
  const chartMin = Math.max(minValue - valuePadding, 0)
  const range = Math.max(chartMax - chartMin, 1)
  const x = paddingX + (index * (width - paddingX * 2)) / Math.max(series.length - 1, 1)
  const y = paddingY + ((chartMax - value) * (height - paddingY * 2)) / range

  return { x, y }
}

function getChartPath(series: number[]): string {
  return series
    .map((value, index) => {
      const point = getChartPoint(value, index, series)
      return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    })
    .join(' ')
}

function getSmoothChartPath(series: number[]): string {
  const points = series.map((value, index) => getChartPoint(value, index, series))

  return points
    .map((point, index) => {
      if (index === 0) {
        return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
      }

      const previousPoint = points[index - 1]
      const controlDistance = (point.x - previousPoint.x) * 0.42
      return [
        'C',
        (previousPoint.x + controlDistance).toFixed(1),
        previousPoint.y.toFixed(1),
        (point.x - controlDistance).toFixed(1),
        point.y.toFixed(1),
        point.x.toFixed(1),
        point.y.toFixed(1),
      ].join(' ')
    })
    .join(' ')
}

function getAreaPath(series: number[]): string {
  const linePath = getSmoothChartPath(series)
  const firstPoint = getChartPoint(series[0], 0, series)
  const lastPoint = getChartPoint(series[series.length - 1], series.length - 1, series)

  return `${linePath} L ${lastPoint.x.toFixed(1)} 210 L ${firstPoint.x.toFixed(1)} 210 Z`
}

function getRevenueSummary(dashboardData: DashboardPayload): DashboardRevenueSummary {
  if (dashboardData.revenueSummary) {
    return dashboardData.revenueSummary
  }

  const revenueCard = dashboardData.kpiCards.find((card) =>
    card.label.toLowerCase().includes('revenue')
  )
  const latestRevenue = dashboardData.revenueSeries[dashboardData.revenueSeries.length - 1]
  const previousRevenue = dashboardData.revenueSeries[dashboardData.revenueSeries.length - 2] ?? latestRevenue
  const revenueDelta = latestRevenue - previousRevenue

  return {
    value: revenueCard?.value ?? `${rupeeSymbol}${latestRevenue.toFixed(0)}k`,
    delta: `${revenueDelta >= 0 ? '+' : ''}${revenueDelta.toFixed(1)}% from last month`,
    details: [],
  }
}

function getHomeChartCopy(variant: DashboardData['variant']) {
  if (variant === 'sales') {
    return {
      title: 'Pipeline Funnel',
      description: 'Stage coverage from new opportunities to committed deals',
      badge: 'Sales',
    }
  }

  if (variant === 'crm') {
    return {
      title: 'Account Health Mix',
      description: 'Relationship status across active customer accounts',
      badge: 'CRM',
    }
  }

  if (variant === 'marketing') {
    return {
      title: 'Lead Growth by Month',
      description: 'Marketing qualified lead momentum across the year',
      badge: 'Marketing',
    }
  }

  return {
    title: 'Revenue Trend',
    description: 'Monthly recurring revenue across the current financial year',
    badge: 'Demo',
  }
}

function getRoleAccentClasses(variant: DashboardData['variant']) {
  if (variant === 'sales') {
    return {
      header: 'from-white via-emerald-50 to-cyan-50',
      value: 'text-emerald-700',
      progress: 'bg-emerald-500',
    }
  }

  if (variant === 'crm') {
    return {
      header: 'from-white via-violet-50 to-sky-50',
      value: 'text-violet-700',
      progress: 'bg-violet-500',
    }
  }

  if (variant === 'marketing') {
    return {
      header: 'from-white via-rose-50 to-amber-50',
      value: 'text-rose-700',
      progress: 'bg-rose-500',
    }
  }

  return {
    header: 'from-white via-slate-50 to-sky-50',
    value: 'text-sky-700',
    progress: 'bg-indigo-400',
  }
}

async function getDashboardData(user: DashboardRequest['user']): Promise<DashboardPayload | null> {
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

    return (await response.json()) as DashboardPayload
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return null
  }
}

export default async function DashboardPage() {
  const { session, menuSections, menuLayout, roles } = await getAuthenticatedShellData()

  const dashboardData = await getDashboardData({
    email: session.user?.email || '',
    name: session.user?.name,
    roleNames: roles.map((role) => role.name),
  })

  if (!dashboardData) {
    return (
      <AppShell
        user={session.user}
        menuSections={menuSections}
        menuLayout={menuLayout}
        pageTitle="Home"
        pageSubtitle="Role based workspace overview"
      >
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600">Failed to load dashboard data. Please try again later.</p>
        </div>
      </AppShell>
    )
  }

  const revenueSeries = dashboardData.revenueSeries
  if (dashboardData.variant === 'general') {
    return (
      <AppShell
        user={session.user}
        menuSections={menuSections}
        menuLayout={menuLayout}
        pageTitle="Home"
        pageSubtitle="Workspace overview"
      >
        <div className="rounded-lg bg-white p-6 shadow sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Welcome</p>
          <h2 className="mt-3 text-2xl font-semibold text-gray-900">{dashboardData.welcomeMessage}</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">{dashboardData.summaryMessage}</p>
        </div>
      </AppShell>
    )
  }

  if (revenueSeries.length === 0) {
    return (
      <AppShell
        user={session.user}
        menuSections={menuSections}
        menuLayout={menuLayout}
        pageTitle="Home"
        pageSubtitle="Role based workspace overview"
      >
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600">Dashboard revenue data is unavailable.</p>
        </div>
      </AppShell>
    )
  }

  const revenuePath = getSmoothChartPath(revenueSeries)
  const revenueAreaPath = getAreaPath(revenueSeries)
  const latestRevenue = revenueSeries[revenueSeries.length - 1]
  const latestRevenuePoint = getChartPoint(latestRevenue, revenueSeries.length - 1, revenueSeries)
  const revenueSummary = getRevenueSummary(dashboardData)
  const axisLabels = [110, 90, 70, 50]
  const chartCopy = getHomeChartCopy(dashboardData.variant)
  const accentClasses = getRoleAccentClasses(dashboardData.variant)
  const shouldShowCampaigns = dashboardData.variant !== 'sales' && dashboardData.variant !== 'crm'
  const maxSeriesValue = Math.max(...revenueSeries, 1)

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Home"
      pageSubtitle="Role based workspace overview"
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">{dashboardData.welcomeMessage}</h2>
              <p className="text-sm text-gray-500 mt-1">{dashboardData.summaryMessage}</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatRupeeCurrency(card.value)}</p>
              <p className={`text-sm mt-2 ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{card.delta} vs previous period</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 overflow-hidden rounded-lg bg-white shadow">
            <div className={`flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r ${accentClasses.header} p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{chartCopy.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {chartCopy.badge}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{chartCopy.description}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-3xl font-bold text-gray-900">
                  {formatRupeeCurrency(revenueSummary.value)}
                </p>
                <p className={`text-sm font-medium ${accentClasses.value}`}>
                  {revenueSummary.delta}
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {dashboardData.variant === 'sales' ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5">
                  <div className="space-y-4">
                    {dashboardData.channelBreakdown.map((stage, index) => (
                      <div key={stage.label} className="grid gap-2 sm:grid-cols-[120px_1fr_52px] sm:items-center">
                        <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                        <div className="h-9 rounded-r-full rounded-l-md bg-white shadow-inner">
                          <div
                            className="flex h-9 items-center justify-end rounded-r-full rounded-l-md bg-gradient-to-r from-emerald-400 to-cyan-500 pr-3 text-xs font-bold text-white shadow-sm"
                            style={{ width: `${Math.max(stage.value, 12)}%` }}
                          >
                            Stage {index + 1}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-800">{stage.value}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {revenueSummary.details.map((detail) => (
                      <div key={detail.label} className="rounded-md bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{detail.label}</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-800">{formatRupeeCurrency(detail.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : dashboardData.variant === 'crm' ? (
                <div className="grid gap-4 rounded-lg border border-violet-100 bg-violet-50/40 p-4 sm:p-5 lg:grid-cols-[240px_1fr]">
                  <div className="flex items-center justify-center">
                    <div
                      className="relative h-52 w-52 rounded-full shadow-inner"
                      style={{
                        background:
                          'conic-gradient(#22c55e 0 52%, #f59e0b 52% 76%, #38bdf8 76% 92%, #ef4444 92% 100%)',
                      }}
                    >
                      <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center shadow">
                        <span className="text-3xl font-bold text-gray-900">{revenueSummary.value}</span>
                        <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-violet-700">tracked</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid content-center gap-3">
                    {dashboardData.channelBreakdown.map((segment) => (
                      <div key={segment.label} className="rounded-md bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{segment.label}</span>
                          <span className="text-sm font-bold text-violet-800">{segment.value}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-violet-50">
                          <div className="h-2 rounded-full bg-violet-500" style={{ width: `${segment.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : dashboardData.variant === 'marketing' ? (
                <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-4 sm:p-5">
                  <div className="flex h-80 items-end gap-2 rounded-lg bg-white px-4 pb-8 pt-5 shadow-inner">
                    {revenueSeries.map((value, index) => (
                      <div key={`${value}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-rose-500 to-amber-300 shadow-sm"
                          style={{ height: `${Math.max((value / maxSeriesValue) * 220, 22)}px` }}
                          title={`${chartMonthLabels[index] ?? `M${index + 1}`}: ${value}`}
                        />
                        <span className="text-[11px] font-semibold text-gray-500">{chartMonthLabels[index] ?? `M${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-[radial-gradient(circle_at_top_right,_#e0f2fe,_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)]">
                  <svg
                    className="h-80 w-full"
                    viewBox="0 0 640 260"
                    role="img"
                    aria-label="Revenue trend chart"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="revenueAreaGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0284c7" stopOpacity="0.24" />
                        <stop offset="56%" stopColor="#38bdf8" stopOpacity="0.11" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="revenueStrokeGradient" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="52%" stopColor="#0891b2" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                      <filter id="revenueGlow" x="-10%" y="-20%" width="120%" height="140%">
                        <feDropShadow dx="0" dy="8" floodColor="#0284c7" floodOpacity="0.16" stdDeviation="5" />
                      </filter>
                    </defs>
                    {[44, 86, 128, 170, 212].map((y) => (
                      <line key={y} x1="54" x2="604" y1={y} y2={y} stroke="#dbe3ef" strokeDasharray="4 8" />
                    ))}
                    {axisLabels.map((label, index) => (
                      <text key={label} x="18" y={50 + index * 42} fill="#64748b" fontSize="11" fontWeight="600">
                        {rupeeSymbol}
                        {label}k
                      </text>
                    ))}
                    <path d="M 54 212 L 604 212" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
                    <path d={revenueAreaPath} fill="url(#revenueAreaGradient)" />
                    <path d={revenuePath} fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.78" strokeWidth="8" />
                    <path d={revenuePath} fill="none" filter="url(#revenueGlow)" stroke="url(#revenueStrokeGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                    {revenueSeries.map((value, index) => {
                      const point = getChartPoint(value, index, revenueSeries)
                      return (
                        <g key={`${value}-${index}`}>
                          <circle cx={point.x} cy={point.y} r="4.5" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" />
                          {index === revenueSeries.length - 1 && (
                            <>
                              <line x1={point.x} x2={point.x} y1={point.y} y2="212" stroke="#0f172a" strokeOpacity="0.35" strokeDasharray="4 6" />
                              <circle cx={point.x} cy={point.y} r="13" fill="#0284c7" opacity="0.14" />
                              <circle cx={point.x} cy={point.y} r="6" fill="#0f172a" stroke="#ffffff" strokeWidth="3" />
                            </>
                          )}
                        </g>
                      )
                    })}
                    <g>
                      <rect x={Math.min(latestRevenuePoint.x - 76, 528)} y={Math.max(latestRevenuePoint.y - 38, 12)} width="76" height="28" rx="14" fill="#0f172a" />
                      <text x={Math.min(latestRevenuePoint.x - 38, 566)} y={Math.max(latestRevenuePoint.y - 20, 30)} fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle">
                        {rupeeSymbol}
                        {latestRevenue.toFixed(0)}k
                      </text>
                    </g>
                    {revenueSeries.map((_, index) => {
                      const point = getChartPoint(revenueSeries[index], index, revenueSeries)
                      return (
                        <text key={index} x={point.x} y="242" fill="#64748b" fontSize="11" fontWeight="600" textAnchor="middle">
                          {chartMonthLabels[index] ?? `M${index + 1}`}
                        </text>
                      )
                    })}
                  </svg>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-white pt-4 sm:grid-cols-3">
                {revenueSummary.details.map((detail) => (
                  <div key={detail.label} className="rounded-md bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {detail.label}
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        detail.tone === 'accent' ? 'text-sky-700' : 'text-gray-900'
                      }`}
                    >
                      {formatRupeeCurrency(detail.value)}
                    </p>
                  </div>
                ))}
              </div>
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
                    <div className={`h-2 rounded-full ${accentClasses.progress}`} style={{ width: `${channel.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {shouldShowCampaigns && (
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
                    <td className="py-3 pr-4 text-sm text-gray-700">{formatRupeeCurrency(campaign.spend)}</td>
                    <td className="py-3 pr-4 text-sm text-green-700 font-semibold">{campaign.roas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        )}
      </div>
    </AppShell>
  )
}
