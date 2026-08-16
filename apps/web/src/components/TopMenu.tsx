'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

import { isDirectMenuSection, MenuIconKey, MenuSectionConfig, menuUiConfig } from '@/config/navigation'
import { useAppName } from '@/components/AppNameProvider'

interface ShellUser {
  name?: string | null
  email?: string | null
}

interface TopMenuProps {
  user: ShellUser | null | undefined
  pageTitle: string
  pageSubtitle?: string
  menuSections: MenuSectionConfig[]
  children: React.ReactNode
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

export default function TopMenu({
  user,
  pageTitle,
  pageSubtitle,
  menuSections,
  children,
}: TopMenuProps) {
  const appName = useAppName()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login', redirect: false })
    router.push('/login')
    router.refresh()
  }

  const visibleMenuSections = menuSections.filter((section) => section.items.length > 0)
  const hasVisibleSections = visibleMenuSections.length > 0
  const isActivePath = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const topLevelTabClasses =
    'inline-flex h-16 items-center gap-2 border-b-4 border-transparent px-4 text-sm font-semibold tracking-wide transition-colors'
  const activeTopLevelTabClasses = 'border-indigo-600 text-indigo-700'
  const inactiveTopLevelTabClasses = `${menuUiConfig.sectionTextClass} hover:border-indigo-300 hover:text-indigo-700`

  return (
    <div className="min-h-screen bg-gray-50">
      <header className={`sticky top-0 z-30 border-b ${menuUiConfig.borderClass} ${menuUiConfig.topbarBackgroundClass}`}>
        <div className="h-16 px-4 md:px-6 grid grid-cols-[auto_1fr_auto] items-stretch gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {hasVisibleSections && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className={`md:hidden p-2 rounded-md ${menuUiConfig.menuIconClass} hover:bg-gray-100`}
                aria-label="Toggle mobile top menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-top-navigation"
              >
                <Icon name={isMobileMenuOpen ? menuUiConfig.mobileCloseIcon : menuUiConfig.mobileOpenIcon} />
              </button>
            )}
            <Link href="/home" className="text-lg font-bold text-indigo-700 whitespace-nowrap">
              {appName}
            </Link>
          </div>

          <nav className="hidden md:flex items-stretch justify-center min-w-0 overflow-visible" aria-label="Primary navigation">
            {visibleMenuSections.map((section) => {
              const isDirectSection = isDirectMenuSection(section)
              const hasActiveItem = section.items.some((item) => isActivePath(item.href))
              const isOpen = openSectionId === section.id
              const dropdownId = `top-menu-${section.id}`
              const tabClasses = `${topLevelTabClasses} ${hasActiveItem ? activeTopLevelTabClasses : inactiveTopLevelTabClasses}`

              if (isDirectSection) {
                const directItem = section.items[0]

                return (
                  <Link
                    key={section.id}
                    href={directItem.href}
                    className={tabClasses}
                  >
                    <Icon name={section.icon} className="w-4 h-4" />
                    <span>{section.label}</span>
                  </Link>
                )
              }

              return (
                <div
                  key={section.id}
                  className="relative flex items-stretch"
                  data-testid={`top-menu-section-${section.id}`}
                  onMouseEnter={() => setOpenSectionId(section.id)}
                  onMouseLeave={() => setOpenSectionId((current) => (current === section.id ? null : current))}
                  onFocus={() => setOpenSectionId(section.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setOpenSectionId(null)
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenSectionId((current) => (current === section.id ? null : section.id))}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-controls={dropdownId}
                    className={tabClasses}
                  >
                    <Icon name={section.icon} className="w-4 h-4" />
                    <span>{section.label}</span>
                    <Icon name={menuUiConfig.sectionExpandIcon} className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                  <div
                    className={`${isOpen ? 'block' : 'hidden'} absolute left-0 top-full z-40 pt-0`}
                  >
                    <div
                      id={dropdownId}
                      role="menu"
                      className={`top-menu-dropdown w-72 rounded-b-xl border border-t-4 border-t-indigo-600 ${menuUiConfig.borderClass} bg-white shadow-xl p-3`}
                    >
                      <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wide text-indigo-700">
                        {section.label}
                      </div>
                      {section.items.map((item) => {
                        const isActive = isActivePath(item.href)

                        return (
                          <Link
                            key={`${section.id}-${item.href}`}
                            href={item.href}
                            role="menuitem"
                            className={`flex items-center gap-2 border-t ${menuUiConfig.borderClass} px-3 py-3 text-sm font-medium transition-colors ${menuUiConfig.subMenuTextClass} ${menuUiConfig.subMenuHoverClass} ${isActive ? menuUiConfig.activeSubMenuClass : ''}`}
                          >
                            <Icon name={item.icon || 'chevron'} className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline max-w-44 truncate text-sm text-gray-600">
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
        </div>

        {hasVisibleSections && isMobileMenuOpen && (
          <nav
            id="mobile-top-navigation"
            className={`md:hidden border-t ${menuUiConfig.borderClass} bg-white p-3 space-y-3`}
            aria-label="Mobile navigation"
          >
            {visibleMenuSections.map((section) => (
              <div key={section.id} className="space-y-1">
                {isDirectMenuSection(section) ? (
                  <Link
                    href={section.items[0].href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${menuUiConfig.sectionTextClass} ${menuUiConfig.sectionHoverClass} ${isActivePath(section.items[0].href) ? menuUiConfig.activeSubMenuClass : ''}`}
                  >
                    <Icon name={section.icon} className="w-4 h-4" />
                    <span>{section.label}</span>
                  </Link>
                ) : (
                  <>
                    <div className={`flex items-center gap-2 px-2 py-1 text-sm font-semibold ${menuUiConfig.sectionTextClass}`}>
                      <Icon name={section.icon} className="w-4 h-4" />
                      <span>{section.label}</span>
                    </div>
                    {section.items.map((item) => {
                      const isActive = isActivePath(item.href)

                      return (
                        <Link
                          key={`${section.id}-${item.href}`}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${menuUiConfig.subMenuTextClass} ${menuUiConfig.subMenuHoverClass} ${isActive ? menuUiConfig.activeSubMenuClass : ''}`}
                        >
                          <Icon name={item.icon || 'chevron'} className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </>
                )}
              </div>
            ))}
          </nav>
        )}
      </header>

      <div className={`border-b ${menuUiConfig.borderClass} bg-white px-4 py-3 md:px-6`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">{pageTitle}</h1>
          {pageSubtitle && <p className="text-sm text-gray-500">{pageSubtitle}</p>}
        </div>
      </div>

      <main className="p-4 md:p-6">{children}</main>
    </div>
  )
}
