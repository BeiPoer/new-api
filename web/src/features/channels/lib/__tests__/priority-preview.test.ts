import { expect, test } from 'vitest'

import type { Channel } from '../../types'
import {
  applyPriorityPreview,
  previewPriorityDrop,
} from '../channel-priority-order'

const channels = [
  { id: 4, priority: 100 },
  { id: 3, priority: 80 },
  { id: 2, priority: 80 },
  { id: 1, priority: 0 },
] as Channel[]

test('before and after target the entire equal-priority tier', () => {
  expect(
    previewPriorityDrop(
      channels,
      { id: 1, target_id: 2, position: 'before' },
      true
    ).map((c) => c.id)
  ).toEqual([4, 1, 3, 2])
  expect(
    previewPriorityDrop(
      channels,
      { id: 4, target_id: 3, position: 'after' },
      true
    ).map((c) => c.id)
  ).toEqual([3, 2, 4, 1])
  expect(channels.map((c) => c.id)).toEqual([4, 3, 2, 1])
})

test('ascending view reverses tier boundaries but preserves the ID tie break', () => {
  const ascending = [...channels].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0) || b.id - a.id
  )
  expect(
    previewPriorityDrop(
      ascending,
      { id: 4, target_id: 3, position: 'after' },
      false
    ).map((c) => c.id)
  ).toEqual([1, 4, 3, 2])
  expect(
    previewPriorityDrop(
      channels,
      { id: 4, target_id: 3, position: 'same' },
      true
    ).map((c) => c.id)
  ).toEqual([4, 3, 2, 1])
})

test('server preview applies visible changes and keeps deterministic null-zero ordering', () => {
  const preview = applyPriorityPreview(
    channels,
    {
      revision: 'next',
      changes: [],
      items: [
        { id: 4, priority: null },
        { id: 3, priority: 80 },
        { id: 2, priority: 80 },
        { id: 1, priority: 90 },
      ],
    },
    true
  )
  expect(preview.map((c) => [c.id, c.priority])).toEqual([
    [1, 90],
    [3, 80],
    [2, 80],
    [4, 0],
  ])
  expect(channels[0].priority).toBe(100)
})
