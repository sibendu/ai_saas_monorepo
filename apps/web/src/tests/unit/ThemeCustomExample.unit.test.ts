import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const publicDir = path.resolve(process.cwd(), 'public')
const defaultThemePath = path.join(publicDir, 'theme-default.css')
const customExampleThemePath = path.join(publicDir, 'theme-custom-example.css')

function readCss(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8')
}

function getCustomPropertyNames(css: string): string[] {
  return Array.from(css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim), (match) => match[1]).sort()
}

function getSemanticColorValues(css: string): Array<[string, string]> {
  return Array.from(css.matchAll(/^\s*(--color-[a-z0-9-]+)\s*:\s*([^;]+);/gim), (match) => [
    match[1],
    match[2].trim(),
  ])
}

describe('theme custom example stylesheet', () => {
  it('exists and matches the default theme variable contract', () => {
    expect(fs.existsSync(customExampleThemePath)).toBe(true)

    const defaultCss = readCss(defaultThemePath)
    const customExampleCss = readCss(customExampleThemePath)

    expect(getCustomPropertyNames(customExampleCss)).toEqual(getCustomPropertyNames(defaultCss))
  })

  it('uses Tailwind opacity-compatible channel values for semantic colors', () => {
    expect(fs.existsSync(customExampleThemePath)).toBe(true)

    const customExampleCss = readCss(customExampleThemePath)
    const colorValues = getSemanticColorValues(customExampleCss)

    expect(colorValues.length).toBeGreaterThan(0)

    for (const [propertyName, value] of colorValues) {
      expect(value, propertyName).toMatch(/^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/)
    }
  })
})
