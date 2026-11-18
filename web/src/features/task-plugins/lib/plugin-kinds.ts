import z from 'zod'

import type { TaskPluginParts } from '../types'

/**
 * The lists the plugins page splits plugins into, one per part. A plugin with
 * several parts is listed under each of them.
 */
export const PLUGIN_KINDS = ['task', 'provider', 'transform'] as const
export type PluginKind = (typeof PLUGIN_KINDS)[number]

export const PLUGIN_KIND_LABELS: Record<PluginKind, string> = {
  task: 'Task',
  provider: 'Channel',
  transform: 'Request processing',
}

export const taskPluginsSearchSchema = z.object({
  kind: z.enum(PLUGIN_KINDS).optional().catch(undefined),
})

export function countPluginKinds(
  partsList: Required<TaskPluginParts>[]
): Record<PluginKind, number> {
  const counts: Record<PluginKind, number> = {
    task: 0,
    provider: 0,
    transform: 0,
  }
  for (const parts of partsList) {
    for (const kind of PLUGIN_KINDS) if (parts[kind]) counts[kind] += 1
  }
  return counts
}

/** Without a chosen kind the page opens on Task, or the first kind that has plugins. */
export function defaultPluginKind(
  counts: Record<PluginKind, number>
): PluginKind {
  return PLUGIN_KINDS.find((kind) => counts[kind] > 0) ?? 'task'
}
