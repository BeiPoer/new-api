import type { Channel } from '../types'

export type PriorityPosition = 'before' | 'after' | 'same'
export type PriorityDrop = {
  id: number
  target_id: number
  position: PriorityPosition
}
export type PriorityChange = {
  id: number
  previous: number | null
  priority: number | null
}
export type PriorityOrder = {
  revision: string
  items: { id: number; priority: number | null }[]
  changes: PriorityChange[]
}
export type PriorityMove = Partial<PriorityDrop> & {
  revision: string
  preview?: boolean
  restore?: PriorityChange[]
}

/** Positions are canonical (descending priority), independent of the view. */
export function previewPriorityDrop(
  channels: Channel[],
  drop: PriorityDrop,
  desc: boolean
): Channel[] {
  const moving = channels.find((channel) => channel.id === drop.id)
  const target = channels.find((channel) => channel.id === drop.target_id)
  if (!moving || !target) return channels
  const remaining = channels.filter((channel) => channel.id !== moving.id)
  const tier = target.priority ?? 0
  const indices = remaining.flatMap((channel, index) =>
    (channel.priority ?? 0) === tier ? [index] : []
  )
  let index = indices[0]
  if (drop.position === 'same') {
    index =
      indices.find((i) => remaining[i].id < moving.id) ??
      (indices.at(-1) ?? 0) + 1
  } else if ((drop.position === 'after') === desc) {
    index = (indices.at(-1) ?? 0) + 1
  }
  remaining.splice(index, 0, moving)
  return remaining
}

export function applyPriorityPreview(
  channels: Channel[],
  order: PriorityOrder,
  desc: boolean
): Channel[] {
  const priorities = new Map(
    order.items.map((item) => [item.id, item.priority])
  )
  return channels
    .map((channel) => ({
      ...channel,
      priority: priorities.get(channel.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        ((a.priority ?? 0) - (b.priority ?? 0)) * (desc ? -1 : 1) || b.id - a.id
    )
}
