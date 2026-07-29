export type MenuIconKey = 'users' | 'profile' | 'workspace' | 'settings' | 'menu' | 'close' | 'chevron'
export type MenuLayout = 'left' | 'top'

export interface MenuItemConfig {
  label: string
  href: string
  icon?: MenuIconKey
}

export interface MenuSectionConfig {
  id: string
  label: string
  icon: MenuIconKey
  items: MenuItemConfig[]
}

export interface MenuUiConfig {
  sidebarBackgroundClass: string
  topbarBackgroundClass: string
  sectionTextClass: string
  subMenuTextClass: string
  sectionHoverClass: string
  subMenuHoverClass: string
  activeSubMenuClass: string
  borderClass: string
  menuIconClass: string
  sidebarToggleIcon: MenuIconKey
  mobileOpenIcon: MenuIconKey
  mobileCloseIcon: MenuIconKey
  sectionExpandIcon: MenuIconKey
}

export function isDirectMenuSection(section: MenuSectionConfig): boolean {
  return (
    section.items.length === 1 &&
    section.items[0].label === section.label
  )
}

export function getConfiguredMenuLayout(): MenuLayout {
  return process.env.MENU_LAYOUT === 'top' ? 'top' : 'left'
}

export const menuSections: MenuSectionConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'workspace',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: 'workspace',
      },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: 'users',
    items: [
      {
        label: 'Customers',
        href: '/customers',
        icon: 'users',
      },
    ],
  },
  {
    id: 'tasks',
    label: 'Task List',
    icon: 'workspace',
    items: [
      {
        label: 'Task List',
        href: '/tasks',
        icon: 'workspace',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    items: [
      {
        label: 'Preferences',
        href: '/preferences',
        icon: 'profile',
      },
    ],
  },
]

export const menuUiConfig: MenuUiConfig = {
  sidebarBackgroundClass: 'bg-white',
  topbarBackgroundClass: 'bg-white',
  sectionTextClass: 'text-gray-800',
  subMenuTextClass: 'text-gray-600',
  sectionHoverClass: 'hover:bg-indigo-50 hover:text-indigo-700',
  subMenuHoverClass: 'hover:bg-gray-100 hover:text-gray-900',
  activeSubMenuClass: 'bg-indigo-100 text-indigo-800',
  borderClass: 'border-gray-200',
  menuIconClass: 'text-gray-700',
  sidebarToggleIcon: 'menu',
  mobileOpenIcon: 'menu',
  mobileCloseIcon: 'close',
  sectionExpandIcon: 'chevron',
}
