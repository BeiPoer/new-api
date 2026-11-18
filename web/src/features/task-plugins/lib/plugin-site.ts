import { usePluginSiteStore } from '@/stores/plugin-site-store'

const AI_ORIGIN = 'https://www.newapi.ai'
const PRO_ORIGIN = 'https://www.newapi.pro'

/** Whether an address is on www.newapi.ai, so the site choice applies to it. */
export function followsPluginSite(address: string): boolean {
  try {
    return new URL(address).origin === AI_ORIGIN
  } catch {
    return false
  }
}

/**
 * `fetch` for plugin lists, plugin files and logos. Requests to www.newapi.ai
 * go to the backup site www.newapi.pro when the user picked it; both sites
 * serve the same plugins, and every file is still checked against its sha256.
 * Other addresses are fetched unchanged. Saved source addresses stay on
 * newapi.ai.
 */
export function fetchFromPluginSite(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (
    usePluginSiteStore.getState().site !== 'pro' ||
    input instanceof Request
  ) {
    return globalThis.fetch(input, init)
  }
  let url: URL
  try {
    url = new URL(String(input))
  } catch {
    return globalThis.fetch(input, init)
  }
  if (url.origin !== AI_ORIGIN) return globalThis.fetch(input, init)
  return globalThis.fetch(PRO_ORIGIN + url.pathname + url.search, init)
}
