import { type RefObject, useLayoutEffect, useState } from 'react'

export type RedirectPanelPlacement = {
  x: number
  y: number
  width: number
}

/** Below this viewport width the floating panel is not offered at all. */
export const REDIRECT_PANEL_MIN_VIEWPORT = 1280
const GAP = 16
const WIDTH = 420

/**
 * Picks where the redirect window first appears: beside the channel sheet on
 * its free side, or overlapping the sheet's inner edge when the viewport has
 * no room there. The window is draggable afterwards, so this is only a start
 * position. `null` means the viewport is too narrow for a floating window.
 */
export function useRedirectPanelPlacement(
  anchorRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  sheetSide: 'left' | 'right'
): RedirectPanelPlacement | null {
  const [placement, setPlacement] = useState<RedirectPanelPlacement | null>(
    null
  )

  useLayoutEffect(() => {
    if (!enabled || window.innerWidth < REDIRECT_PANEL_MIN_VIEWPORT) {
      setPlacement(null)
      return
    }
    const anchor =
      anchorRef.current?.closest<HTMLElement>('[data-slot="sheet-content"]') ??
      anchorRef.current
    if (!anchor) {
      setPlacement(null)
      return
    }
    const rect = anchor.getBoundingClientRect()
    const beside =
      sheetSide === 'left' ? rect.right + GAP : rect.left - GAP - WIDTH
    const x = Math.min(Math.max(GAP, beside), window.innerWidth - WIDTH - GAP)
    setPlacement({ x, y: rect.top + GAP, width: WIDTH })
  }, [anchorRef, enabled, sheetSide])

  return placement
}
