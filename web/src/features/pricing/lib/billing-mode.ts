import type { PricingModel } from '../types'
import { hasTaskUsageSchema, isDynamicPricingModel } from './dynamic-price'
import { isTokenBasedModel } from './model-helpers'
import { withBasePricing } from './plugin-pricing'

export type BillingModeLabelKey =
  | 'Per Request'
  | 'Dynamic Pricing'
  | 'Token-based'
  | 'Task billing'

export function getBillingModeLabelKey(
  listedModel: PricingModel
): BillingModeLabelKey {
  const model = withBasePricing(listedModel)
  // Task-usage models badge as one business category; the metering unit
  // ($/1M token, $/credit, $/second) is already carried by the price line.
  if (hasTaskUsageSchema(model)) return 'Task billing'
  if (isDynamicPricingModel(model)) return 'Dynamic Pricing'
  if (isTokenBasedModel(model)) return 'Token-based'
  return 'Per Request'
}
