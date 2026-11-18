import { useQuery } from '@tanstack/react-query'

import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { getNodeSync } from '../api'
import { NODE_SYNC_QUERY_KEY, registeredSyncTopics } from '../lib/node-sync'

const UPDATING_INTERVAL_MS = 3_000
const IDLE_INTERVAL_MS = 30_000

/**
 * Which nodes have loaded the latest change of each topic. Refetches every
 * 3 s while an online node has not loaded a watched topic (every topic
 * without a list), otherwise every 30 s and when the window gets focus.
 * Only the root user can read it.
 */
export function useNodeSync(topics?: string[]) {
  const isRoot = useAuthStore(
    (state) => state.auth.user?.role === ROLE.SUPER_ADMIN
  )
  return useQuery({
    queryKey: NODE_SYNC_QUERY_KEY,
    queryFn: getNodeSync,
    enabled: isRoot,
    retry: false,
    meta: { errorToast: false },
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const sync = query.state.data
      if (!sync) return IDLE_INTERVAL_MS
      const watched = registeredSyncTopics(sync, topics)
      const updating = sync.nodes.some(
        (node) =>
          node.online && watched.some((topic) => !node.topics[topic]?.synced)
      )
      return updating ? UPDATING_INTERVAL_MS : IDLE_INTERVAL_MS
    },
  })
}
