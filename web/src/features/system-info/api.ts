import type { SystemTaskFilters } from '@/features/system-settings/types'
import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import type {
  NodeSync,
  NodeSyncResponse,
  SystemInstanceDeleteResponse,
  SystemInstanceListResponse,
  SystemTaskHistoryDeleteResponse,
} from './types'

/** Each sync topic and whether every node has loaded its latest change. */
export async function getNodeSync(): Promise<NodeSync> {
  const res = await api.get<NodeSyncResponse>('/api/system-info/sync')
  const sync = requireServerSuccess(res.data).data
  return { topics: sync?.topics ?? [], nodes: sync?.nodes ?? [] }
}

export async function listSystemInstances() {
  const res = await api.get<SystemInstanceListResponse>(
    '/api/system-info/instances'
  )
  return res.data
}

export async function deleteStaleSystemInstances() {
  const res = await api.delete<SystemInstanceDeleteResponse>(
    '/api/system-info/stale-instances'
  )
  return res.data
}

export async function deleteStaleSystemInstance(nodeName: string) {
  const res = await api.delete<SystemInstanceDeleteResponse>(
    `/api/system-info/instances/${encodeURIComponent(nodeName)}`
  )
  return res.data
}

export async function deleteSystemTaskHistory(
  filters: Pick<SystemTaskFilters, 'type' | 'status'>
) {
  const res = await api.delete<SystemTaskHistoryDeleteResponse>(
    '/api/system-task/history',
    { params: filters }
  )
  return res.data
}
