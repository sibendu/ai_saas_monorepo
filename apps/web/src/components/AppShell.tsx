'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  isDirectMenuSection,
  MenuLayout,
  MenuIconKey,
  MenuSectionConfig,
  menuSections,
  menuUiConfig,
} from '@/config/navigation'
import TopMenu from '@/components/TopMenu'
import { useAppName } from '@/components/AppNameProvider'

const sidebarExpandedStorageKey = 'saas-sidebar-expanded-sections'

interface ShellUser {
  name?: string | null
  email?: string | null
}

interface AppShellProps {
  user: ShellUser | null | undefined
  pageTitle: string
  pageSubtitle?: string
  menuSections?: MenuSectionConfig[]
  menuLayout?: MenuLayout
  children: ReactNode
}

function Icon({ name, className = 'w-5 h-5' }: { name: MenuIconKey; className?: string }) {
  if (name === 'users') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="3" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    )
  }

  if (name === 'profile') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
    )
  }

  if (name === 'settings') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.8a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.8a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.1.4 1.7 1.7 0 0 0-.6 1Z" />
      </svg>
    )
  }

  if (name === 'workspace') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 4v16" />
      </svg>
    )
  }

  if (name === 'close') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    )
  }

  if (name === 'chevron') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m9 18 6-6-6-6" />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  )
}

function getInitialExpandedSections(menuSectionsToSeed: MenuSectionConfig[]): Record<string, boolean> {
  const defaultExpandedSections = menuSectionsToSeed.reduce((acc, section) => {
    acc[section.id] = false
    return acc
  }, {} as Record<string, boolean>)

  if (typeof window === 'undefined') {
    return defaultExpandedSections
  }

  try {
    const storedValue = window.localStorage.getItem(sidebarExpandedStorageKey)

    if (!storedValue) {
      return defaultExpandedSections
    }

    const storedSectionIds = JSON.parse(storedValue)

    if (!Array.isArray(storedSectionIds)) {
      return defaultExpandedSections
    }

    const sectionIds = new Set(
      storedSectionIds.filter((sectionId): sectionId is string => typeof sectionId === 'string')
    )

    return menuSectionsToSeed.reduce((acc, section) => {
      acc[section.id] = sectionIds.has(section.id)
      return acc
    }, {} as Record<string, boolean>)
  } catch {
    return defaultExpandedSections
  }
}

export default function AppShell({
  user,
  pageTitle,
  pageSubtitle,
  menuSections: providedMenuSections,
  menuLayout = 'left',
  children,
}: AppShellProps) {
  const appName = useAppName()
  const pathname = usePathname()
  const router = useRouter()
  const visibleMenuSections = providedMenuSections ?? menuSections
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    getInitialExpandedSections(visibleMenuSections)
  )

  const sectionWithActiveItem = useMemo(() => {
    return visibleMenuSections.find((section) =>
      section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    )?.id
  }, [pathname, visibleMenuSections])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  useEffect(() => {
    setExpandedSections((currentSections) =>
      visibleMenuSections.reduce((acc, section) => {
        acc[section.id] = currentSections[section.id] ?? false
        return acc
      }, {} as Record<string, boolean>)
    )
  }, [visibleMenuSections])

  useEffect(() => {
    const expandedSectionIds = Object.entries(expandedSections)
      .filter(([, isExpanded]) => isExpanded)
      .map(([sectionId]) => sectionId)

    window.localStorage.setItem(sidebarExpandedStorageKey, JSON.stringify(expandedSectionIds))
  }, [expandedSections])

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login', redirect: false })
    router.push('/login')
    router.refresh()
  }

  if (menuLayout === 'top') {
    return (
      <TopMenu
        user={user}
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
        menuSections={visibleMenuSections}
      >
        {children}
      </TopMenu>
    )
  }

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className={`h-16 px-3 flex items-center justify-between border-b ${menuUiConfig.borderClass}`}>
        {!isSidebarCollapsed && (
          <span className="text-lg font-bold text-indigo-700">{appName}</span>
        )}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          className={`hidden md:inline-flex p-2 rounded-md ${menuUiConfig.menuIconClass} hover:bg-gray-100`}
          aria-label="Toggle sidebar"
        >
          <Icon name={menuUiConfig.sidebarToggleIcon} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-2">
        {visibleMenuSections.map((section) => {
          const isExpanded = expandedSections[section.id]
          const isActiveSection = section.id === sectionWithActiveItem
          const isDirectSection = isDirectMenuSection(section)

          if (isDirectSection) {
            const directItem = section.items[0]
            const isActive = pathname === directItem.href || pathname.startsWith(`${directItem.href}/`)

            return (
              <Link
                key={section.id}
                href={directItem.href}
                onClick={() => setIsMobileSidebarOpen(false)}
                aria-label={section.label}
                title={section.label}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${menuUiConfig.sectionTextClass} ${menuUiConfig.sectionHoverClass} ${isActive ? 'bg-indigo-50 text-indigo-700' : ''}`}
              >
                <Icon name={section.icon} className="w-4 h-4" />
                {!isSidebarCollapsed && <span>{section.label}</span>}
              </Link>
            )
          }

          return (
            <div key={section.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                aria-label={section.label}
                title={section.label}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${menuUiConfig.sectionTextClass} ${menuUiConfig.sectionHoverClass} ${isActiveSection ? 'bg-indigo-50' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <Icon name={section.icon} className="w-4 h-4" />
                  {!isSidebarCollapsed && section.label}
                </span>
                {!isSidebarCollapsed && (
                  <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    <Icon name={menuUiConfig.sectionExpandIcon} className="w-4 h-4" />
                  </span>
                )}
              </button>

              {isExpanded && !isSidebarCollapsed && (
                <div className="space-y-1 pl-2">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href

                    return (
                      <Link
                        key={`${section.id}-${item.href}`}
                        href={item.href}
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${menuUiConfig.subMenuTextClass} ${menuUiConfig.subMenuHoverClass} ${isActive ? menuUiConfig.activeSubMenuClass : ''}`}
                      >
                        <Icon name={item.icon || 'chevron'} className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {isMobileSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`fixed z-40 inset-y-0 left-0 transform transition-all duration-200 ease-in-out ${menuUiConfig.sidebarBackgroundClass} border-r ${menuUiConfig.borderClass} w-72 md:translate-x-0 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'} ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {sidebarContent}
      </aside>

      <div className={`flex-1 transition-all duration-200 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        <header className={`h-16 border-b ${menuUiConfig.borderClass} ${menuUiConfig.topbarBackgroundClass} flex items-center justify-between px-4 md:px-6`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
              className={`md:hidden p-2 rounded-md ${menuUiConfig.menuIconClass} hover:bg-gray-100`}
              aria-label="Toggle mobile sidebar"
            >
              <Icon
                name={isMobileSidebarOpen ? menuUiConfig.mobileCloseIcon : menuUiConfig.mobileOpenIcon}
              />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">{pageTitle}</h1>
              {pageSubtitle && <p className="hidden md:block text-sm text-gray-500">{pageSubtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-gray-600">
              {user?.name || user?.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
