import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_STORAGE_KEYS } from '@/lib/theme-storage'

// The inline script in index.html must apply the theme class before React
// mounts; Dark Reader checks `html.dark` only once while the page loads.
const html = readFileSync(
  resolve(import.meta.dirname, '../../../index.html'),
  'utf8'
)
const bootScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''

function runBootScript() {
  new Function(bootScript)()
}

function mockSystemDarkMode(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: dark && query === '(prefers-color-scheme: dark)',
        media: query,
      }) as MediaQueryList
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.documentElement.classList.remove('light', 'dark')
})

describe('index.html theme boot script', () => {
  it('applies the saved dark preference to html before React mounts', () => {
    mockSystemDarkMode(false)
    localStorage.setItem(THEME_STORAGE_KEYS.mode, 'dark')

    runBootScript()

    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement).not.toHaveClass('light')
  })

  it('applies the saved light preference even when the system is dark', () => {
    mockSystemDarkMode(true)
    localStorage.setItem(THEME_STORAGE_KEYS.mode, 'light')

    runBootScript()

    expect(document.documentElement).toHaveClass('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('follows the system dark mode when no preference is saved', () => {
    mockSystemDarkMode(true)

    runBootScript()

    expect(document.documentElement).toHaveClass('dark')
  })

  it('follows the system light mode when the saved value is invalid', () => {
    mockSystemDarkMode(false)
    localStorage.setItem(THEME_STORAGE_KEYS.mode, 'sepia')

    runBootScript()

    expect(document.documentElement).toHaveClass('light')
  })
})
