export const THEME_STORAGE_KEYS = {
  mode: 'newapi:theme:v1:mode',
  preset: 'newapi:theme:v1:preset',
  font: 'newapi:theme:v1:font',
  radius: 'newapi:theme:v1:radius',
  scale: 'newapi:theme:v1:scale',
  contentLayout: 'newapi:theme:v1:content-layout',
} as const

export function readThemePreference<T extends string>(
  key: string,
  allowed: ReadonlySet<T>,
  fallback: T
): T {
  if (typeof window === 'undefined') return fallback

  try {
    // Legacy cookies are shared across ports, so importing them would restore
    // preferences that may belong to another local instance.
    const value = window.localStorage.getItem(key)
    return value && allowed.has(value as T) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

export function writeThemePreference(key: string, value: string | null): void {
  if (typeof window === 'undefined') return

  try {
    if (value === null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // Keep theme controls usable when storage is blocked or full.
  }
}
