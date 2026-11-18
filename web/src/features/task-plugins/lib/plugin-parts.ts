import type { TaskPluginMeta, TaskPluginParts } from '../types'

/**
 * The parts a plugin has, with the fallbacks for older servers: a missing
 * `task` counts as a task part, a missing `provider` follows `meta.relay`, and
 * a missing credential hook or request processing part counts as absent.
 */
export function resolvePluginParts(
  item: TaskPluginParts & { meta: Pick<TaskPluginMeta, 'relay'> }
): Required<TaskPluginParts> {
  return {
    task: item.task ?? true,
    provider: item.provider ?? Boolean(item.meta.relay?.length),
    login: item.login ?? false,
    refresh: item.refresh ?? false,
    transform: item.transform ?? false,
  }
}
