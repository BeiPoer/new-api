import { api } from '@/lib/api'

import type { PerformanceMetricsData, PerfSummaryAllData } from './types'

export async function getPerfMetricsSummary(
  hours = 24,
  recentModels?: string[]
): Promise<PerfSummaryAllData> {
  const res = await api.get<PerfSummaryAllData>('/api/perf-metrics/summary', {
    params: { hours, recent_model: recentModels },
    paramsSerializer: { indexes: null },
  })
  return res.data
}

export async function getPerfMetrics(
  modelName: string,
  hours = 24
): Promise<PerformanceMetricsData> {
  const res = await api.get<PerformanceMetricsData>('/api/perf-metrics', {
    params: {
      model: modelName,
      hours,
    },
  })
  return res.data
}
