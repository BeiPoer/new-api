import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Which site this browser downloads plugins from: `ai` is the main site
 * www.newapi.ai, `pro` the backup site www.newapi.pro. Only the user changes it.
 */
export type PluginSiteChoice = 'ai' | 'pro'

type PluginSiteState = {
  site: PluginSiteChoice
  setSite: (site: PluginSiteChoice) => void
}

export const usePluginSiteStore = create<PluginSiteState>()(
  persist(
    (set) => ({
      site: 'ai',
      setSite: (site) => set({ site }),
    }),
    {
      name: 'plugin-site',
      version: 1,
      partialize: (state) => ({ site: state.site }),
      // Version 0 also stored `auto`, which switched sites by itself; it now
      // reads as the main site.
      migrate: (persisted) => ({
        site:
          (persisted as { site?: unknown } | null)?.site === 'pro'
            ? 'pro'
            : 'ai',
      }),
    }
  )
)
