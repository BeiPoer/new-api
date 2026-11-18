import {
  normalizeTierLabel,
  type ParsedTaskTier,
  type ParsedTier,
} from './billing-expr'

type BreakdownMatchTier = ParsedTier | ParsedTaskTier

function tierMatchesNormalizedLabel(
  tier: BreakdownMatchTier,
  normalizedMatchedTierLabel: string
): boolean {
  return (
    normalizedMatchedTierLabel !== '' &&
    normalizeTierLabel(tier.label) === normalizedMatchedTierLabel
  )
}

/**
 * Decide whether a price-table row is the settlement hit.
 * Label equality (after normalizeTierLabel) wins; usage-facts matching is
 * only a fallback when no display row still carries the engine label.
 */
export function isBreakdownTierMatched(
  tier: BreakdownMatchTier,
  tiers: readonly BreakdownMatchTier[],
  matchedTierLabel?: string | null,
  usageFacts?: Record<string, string | number>,
  billingUnit?: 'token' | 'request',
  fixedPrice?: number
): boolean {
  if (!('unitPrices' in tier) && billingUnit) {
    if ((tier.billingUnit ?? 'token') !== billingUnit) return false
    if (
      billingUnit === 'request' &&
      fixedPrice !== undefined &&
      tier.fixedPrice !== fixedPrice
    ) {
      return false
    }
  }
  const normalizedMatchedTierLabel = normalizeTierLabel(
    matchedTierLabel ?? undefined
  )
  if (tierMatchesNormalizedLabel(tier, normalizedMatchedTierLabel)) {
    if (
      'unitPrices' in tier &&
      tiers.filter((candidate) =>
        tierMatchesNormalizedLabel(candidate, normalizedMatchedTierLabel)
      ).length > 1
    ) {
      // Expanded rows can share one engine label. Time-dependent rows cannot
      // be resolved from usage alone; never substitute the current wall clock.
      return (
        !tier.conditionText &&
        Boolean(usageFacts) &&
        tier.conditions.length > 0 &&
        tier.conditions.every(
          (condition) =>
            'field' in condition &&
            String(usageFacts?.[condition.field]) === condition.value
        )
      )
    }
    return true
  }
  if (
    tiers.some((candidate) =>
      tierMatchesNormalizedLabel(candidate, normalizedMatchedTierLabel)
    )
  ) {
    return false
  }
  if (
    !usageFacts ||
    tier.conditions.length === 0 ||
    ('unitPrices' in tier && tier.conditionText)
  ) {
    return false
  }
  return tier.conditions.every((condition) => {
    if (!('field' in condition)) {
      return false
    }
    const fact = usageFacts[condition.field]
    if (fact === undefined) {
      return false
    }
    return String(fact) === condition.value
  })
}
