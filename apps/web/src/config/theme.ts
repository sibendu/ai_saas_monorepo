export type ThemeName = string

const DEFAULT_THEME: ThemeName = 'light'
const SAFE_THEME_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface AvailableThemeStyle {
  name: ThemeName
  label: string
  description: string
  href: string
  swatches: string[]
}

export const availableThemeStyles: AvailableThemeStyle[] = [
  {
    name: 'light',
    label: 'Light',
    description: 'Airy sky and rose interface with soft blue surfaces.',
    href: '/theme-light.css',
    swatches: ['#0284c7', '#e0f2fe', '#e11d48'],
  },
  {
    name: 'dark',
    label: 'Nation',
    description: 'Saffron header with light green workspace sections.',
    href: '/theme-dark.css',
    swatches: ['#ff9933', '#dcfce7', '#16a34a'],
  },
  {
    name: 'default',
    label: 'Default',
    description: 'Canonical product theme used as the styling baseline.',
    href: '/theme-default.css',
    swatches: ['#4f46e5', '#9333ea', '#f9fafb'],
  },
  {
    name: 'custom',
    label: 'Custom',
    description: 'Production custom theme with blue header and teal navigation.',
    href: '/theme-custom.css',
    swatches: ['#0b5ed7', '#0d7486', '#f1f5f9'],
  },
]

export function getConfiguredTheme(): ThemeName {
  const configuredTheme = (process.env.STYLE ?? process.env.THEME)?.trim().toLowerCase()

  if (!configuredTheme || !SAFE_THEME_NAME_PATTERN.test(configuredTheme)) {
    return DEFAULT_THEME
  }

  return configuredTheme
}

export function getConfiguredThemeHref(): string {
  return `/theme-${getConfiguredTheme()}.css`
}

export function isSafeThemeName(themeName: unknown): themeName is ThemeName {
  return typeof themeName === 'string' && SAFE_THEME_NAME_PATTERN.test(themeName)
}

export function isAvailableThemeName(themeName: unknown): themeName is ThemeName {
  return isSafeThemeName(themeName) && availableThemeStyles.some((style) => style.name === themeName)
}
