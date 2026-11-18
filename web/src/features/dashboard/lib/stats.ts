import type { QuotaDataItem } from '@/features/dashboard/types'

/**
 * Safe division: handles NaN and Infinity cases
 */
export function safeDivide(
  value: number,
  divisor: number,
  precision: number = 3
): number {
  const result = value / divisor
  if (isNaN(result) || !isFinite(result)) return 0
  const factor = Math.pow(10, precision)
  return Math.round(result * factor) / factor
}

/**
 * Calculate aggregated statistics from quota data
 */
export function calculateDashboardStats(data: QuotaDataItem[]) {
  return data.reduce(
    (acc, item) => {
      const cacheRead = item.cache_read_tokens ?? 0
      const cacheCreation = item.cache_creation_tokens ?? 0
      return {
        totalQuota: acc.totalQuota + (Number(item.quota) || 0),
        totalCount: acc.totalCount + (Number(item.count) || 0),
        totalTokens: acc.totalTokens + (Number(item.token_used) || 0),
        totalCacheReadTokens:
          acc.totalCacheReadTokens +
          (Number.isFinite(cacheRead) ? Math.max(0, cacheRead) : 0),
        totalCacheCreationTokens:
          acc.totalCacheCreationTokens +
          (Number.isFinite(cacheCreation) ? Math.max(0, cacheCreation) : 0),
      }
    },
    {
      totalQuota: 0,
      totalCount: 0,
      totalTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheCreationTokens: 0,
    }
  )
}
