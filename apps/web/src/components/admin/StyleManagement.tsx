'use client'

import { useEffect, useState } from 'react'
import { MenuLayout } from '@/config/navigation'
import { AvailableThemeStyle, availableThemeStyles, ThemeName } from '@/config/theme'
import { readApiResponse } from '@/lib/client-api'

interface AdminStyleData {
  appName: string
  activeStyle: ThemeName
  activeMenuLayout: MenuLayout
  styles: AvailableThemeStyle[]
}

function reloadOnStyleTab() {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}#style`
  )
  window.location.reload()
}

export default function StyleManagement() {
  const [activeStyle, setActiveStyle] = useState<ThemeName>('light')
  const [activeAppName, setActiveAppName] = useState('SaaS Platform')
  const [selectedAppName, setSelectedAppName] = useState('SaaS Platform')
  const [activeMenuLayout, setActiveMenuLayout] = useState<MenuLayout>('left')
  const [selectedMenuLayout, setSelectedMenuLayout] = useState<MenuLayout>('left')
  const [styles, setStyles] = useState<AvailableThemeStyle[]>(availableThemeStyles)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isCurrentRequest = true

    async function loadStyle() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch('/api/admin/style', { cache: 'no-store' })
        const payload = await readApiResponse<AdminStyleData>(response, 'Failed to load styles')

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? 'Failed to load styles')
        }

        if (!isCurrentRequest) {
          return
        }

        setActiveStyle(payload.data.activeStyle)
        setActiveAppName(payload.data.appName)
        setSelectedAppName(payload.data.appName)
        setActiveMenuLayout(payload.data.activeMenuLayout)
        setSelectedMenuLayout(payload.data.activeMenuLayout)
        setStyles(payload.data.styles)
      } catch (error) {
        if (!isCurrentRequest) {
          return
        }

        setErrorMessage(error instanceof Error ? error.message : 'Failed to load styles')
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false)
        }
      }
    }

    void loadStyle()

    return () => {
      isCurrentRequest = false
    }
  }, [])

  async function handleApplyStyle(themeName: ThemeName) {
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/style', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ style: themeName }),
      })
      const payload = await readApiResponse<AdminStyleData>(response, 'Failed to apply style')

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to apply style')
      }

      setActiveStyle(payload.data.activeStyle)
      setActiveMenuLayout(payload.data.activeMenuLayout)
      setSelectedMenuLayout(payload.data.activeMenuLayout)
      setStyles(payload.data.styles)
      setStatusMessage(payload.message ?? 'Style applied successfully')

      reloadOnStyleTab()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to apply style')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleApplyAppName() {
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/style', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName: selectedAppName }),
      })
      const payload = await readApiResponse<AdminStyleData>(response, 'Failed to update application name')

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to update application name')
      }

      setActiveAppName(payload.data.appName)
      setSelectedAppName(payload.data.appName)
      setStatusMessage(payload.message ?? 'Application name updated successfully')
      reloadOnStyleTab()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update application name')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleApplyMenuLayout() {
    setIsSaving(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/style', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ menuLayout: selectedMenuLayout }),
      })
      const payload = await readApiResponse<AdminStyleData>(
        response,
        'Failed to apply menu disposition'
      )

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to apply menu disposition')
      }

      setActiveStyle(payload.data.activeStyle)
      setActiveMenuLayout(payload.data.activeMenuLayout)
      setSelectedMenuLayout(payload.data.activeMenuLayout)
      setStyles(payload.data.styles)
      setStatusMessage(payload.message ?? 'Display settings applied successfully')

      reloadOnStyleTab()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to apply menu disposition'
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-5">
        <div className="bg-white rounded-lg shadow p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-gray-900">Style</h2>
          <p className="mt-1 text-sm text-gray-500">Loading available styles...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-lg shadow p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,20rem)_auto] sm:items-end">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Application name</h3>
            <p className="mt-1 text-sm text-gray-500">Shown in the application navigation and authentication screens.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="app-name">
              Name
            </label>
            <input
              id="app-name"
              value={selectedAppName}
              onChange={(event) => setSelectedAppName(event.target.value)}
              maxLength={80}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              disabled={isSaving}
            />
          </div>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            onClick={() => void handleApplyAppName()}
            disabled={isSaving || selectedAppName.trim() === activeAppName}
          >
            {selectedAppName.trim() === activeAppName ? 'Applied' : 'Apply'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Style</h2>
          <p className="mt-1 text-sm text-gray-500">
            Apply the application-wide style stored in the server environment.
          </p>
        </div>

        {statusMessage && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {statusMessage}
          </p>
        )}
        {errorMessage && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)_auto] sm:items-end">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Menu disposition</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose whether navigation appears on the left or across the top.
            </p>
          </div>
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              htmlFor="menu-layout"
            >
              Layout
            </label>
            <select
              id="menu-layout"
              value={selectedMenuLayout}
              onChange={(event) => setSelectedMenuLayout(event.target.value as MenuLayout)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              disabled={isSaving}
            >
              <option value="left">Left</option>
              <option value="top">Top</option>
            </select>
          </div>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            onClick={() => void handleApplyMenuLayout()}
            disabled={isSaving || selectedMenuLayout === activeMenuLayout}
          >
            {selectedMenuLayout === activeMenuLayout ? 'Applied' : 'Apply'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {styles.map((style) => {
          const isActive = style.name === activeStyle

          return (
            <article
              key={style.name}
              className={`rounded-lg border bg-white p-4 shadow-sm ${
                isActive ? 'border-indigo-600 ring-2 ring-indigo-500/30' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{style.label}</h3>
                  <p className="mt-1 text-sm text-gray-500">{style.description}</p>
                </div>
                {isActive && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                    Active
                  </span>
                )}
              </div>

              <div className="mt-4 flex gap-2" aria-label={`${style.label} color swatches`}>
                {style.swatches.map((swatch) => (
                  <span
                    key={swatch}
                    className="h-8 w-12 rounded-md border border-gray-200"
                    style={{ backgroundColor: swatch }}
                    title={swatch}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="truncate text-xs font-medium text-gray-500">{style.href}</span>
                <button
                  type="button"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  onClick={() => void handleApplyStyle(style.name)}
                  disabled={isActive || isSaving}
                >
                  {isActive ? 'Applied' : 'Apply style'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
