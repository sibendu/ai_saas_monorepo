import { afterEach, describe, expect, it } from 'vitest'
import { getConfiguredTheme, getConfiguredThemeHref } from '@/config/theme'

const originalTheme = process.env.THEME
const originalStyle = process.env.STYLE

function restoreThemeEnv() {
  if (originalTheme === undefined) {
    delete process.env.THEME
    return
  }

  process.env.THEME = originalTheme

  if (originalStyle === undefined) {
    delete process.env.STYLE
    return
  }

  process.env.STYLE = originalStyle
}

describe('theme config', () => {
  afterEach(() => {
    restoreThemeEnv()
  })

  it('defaults to light when STYLE and THEME are missing', () => {
    delete process.env.STYLE
    delete process.env.THEME

    expect(getConfiguredTheme()).toBe('light')
    expect(getConfiguredThemeHref()).toBe('/theme-light.css')
  })

  it('defaults to light when STYLE is blank', () => {
    delete process.env.THEME
    process.env.STYLE = '   '

    expect(getConfiguredTheme()).toBe('light')
    expect(getConfiguredThemeHref()).toBe('/theme-light.css')
  })

  it('falls back to THEME when STYLE is missing', () => {
    delete process.env.STYLE
    process.env.THEME = '   '

    expect(getConfiguredTheme()).toBe('light')
    expect(getConfiguredThemeHref()).toBe('/theme-light.css')
  })

  it.each([
    ['light', 'light', '/theme-light.css'],
    ['dark', 'dark', '/theme-dark.css'],
    [' custom ', 'custom', '/theme-custom.css'],
    ['BRAND-2026', 'brand-2026', '/theme-brand-2026.css'],
  ])('resolves safe theme value %s', (rawTheme, expectedTheme, expectedHref) => {
    process.env.STYLE = rawTheme

    expect(getConfiguredTheme()).toBe(expectedTheme)
    expect(getConfiguredThemeHref()).toBe(expectedHref)
  })

  it.each([
    '../dark',
    '/theme-dark.css',
    'https://example.com/theme-dark.css',
    'javascript:alert(1)',
    'data:text/css,body{}',
    'dark.css',
    'dark?x=1',
    'dark_theme',
    '-dark',
    'dark-',
  ])('falls back to light for unsafe theme value %s', (rawTheme) => {
    process.env.STYLE = rawTheme

    expect(getConfiguredTheme()).toBe('light')
    expect(getConfiguredThemeHref()).toBe('/theme-light.css')
  })
})
