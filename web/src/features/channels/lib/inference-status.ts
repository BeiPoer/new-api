export type InferenceMetric = {
  name: string
  labels: Record<string, string>
  value: number
}

export type InferenceStatus = {
  sampled_at: number
  endpoints: Record<string, { status: number; error?: string }>
  version: string
  models: { id: string; root: string; max_model_len: number | null }[]
  metrics: InferenceMetric[]
  raw_metrics: string
}

export function metricValue(
  metrics: InferenceMetric[],
  name: string,
  labels: Record<string, string> = {},
  mode: 'sum' | 'max' = 'sum'
): number | undefined {
  const values = metrics
    .filter(
      (metric) =>
        metric.name === name &&
        Object.entries(labels).every(
          ([key, value]) => metric.labels[key] === value
        )
    )
    .map((metric) => metric.value)
  if (
    !values.length ||
    values.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    return undefined
  }
  if (mode === 'max') return Math.max(...values)
  const total = values.reduce((sum, value) => sum + value, 0)
  return Number.isFinite(total) ? total : undefined
}

export function metricRatio(
  numerator: number | undefined,
  denominator: number | undefined
): number | undefined {
  if (
    numerator === undefined ||
    denominator === undefined ||
    denominator <= 0
  ) {
    return undefined
  }
  const ratio = numerator / denominator
  return Number.isFinite(ratio) ? ratio : undefined
}

export function metricMean(
  metrics: InferenceMetric[],
  name: string
): number | undefined {
  return metricRatio(
    metricValue(metrics, `${name}_sum`),
    metricValue(metrics, `${name}_count`)
  )
}

function metricSeriesKey(metric: InferenceMetric): string {
  return JSON.stringify([
    metric.name,
    Object.entries(metric.labels).sort(([a], [b]) => a.localeCompare(b)),
  ])
}

export function recentMetrics(
  current: InferenceStatus,
  previous?: InferenceStatus
): { seconds: number; metrics: InferenceMetric[] } | undefined {
  if (
    !previous ||
    current.endpoints['/metrics']?.status !== 200 ||
    previous.endpoints['/metrics']?.status !== 200 ||
    current.endpoints['/metrics']?.error ||
    previous.endpoints['/metrics']?.error ||
    current.sampled_at <= previous.sampled_at
  ) {
    return undefined
  }
  const old = new Map(
    previous.metrics.map((metric) => [metricSeriesKey(metric), metric.value])
  )
  const metrics: InferenceMetric[] = []
  const tracked = current.metrics.filter(
    (metric) =>
      metric.name === 'process_start_time_seconds' ||
      /_(total|sum|count|created)$/.test(metric.name)
  )
  const previousTracked = previous.metrics.filter(
    (metric) =>
      metric.name === 'process_start_time_seconds' ||
      /_(total|sum|count|created)$/.test(metric.name)
  )
  if (tracked.length !== previousTracked.length) return undefined
  for (const metric of tracked) {
    const last = old.get(metricSeriesKey(metric))
    if (
      last === undefined ||
      !Number.isFinite(metric.value) ||
      metric.value < last
    ) {
      return undefined
    }
    if (
      metric.name === 'process_start_time_seconds' ||
      metric.name.endsWith('_created')
    ) {
      if (metric.value !== last) return undefined
      continue
    }
    metrics.push({ ...metric, value: metric.value - last })
  }
  return { seconds: (current.sampled_at - previous.sampled_at) / 1000, metrics }
}
