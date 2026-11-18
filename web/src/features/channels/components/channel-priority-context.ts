import { createContext, type KeyboardEvent, type PointerEvent } from 'react'

type PriorityControls = {
  reason: 'sort' | 'tag' | 'permission' | 'busy' | null
  start: (event: PointerEvent<HTMLButtonElement>, id: number) => void
  keyDown: (event: KeyboardEvent<HTMLButtonElement>, id: number) => void
}

export const ChannelPriorityContext = createContext<PriorityControls | null>(
  null
)
