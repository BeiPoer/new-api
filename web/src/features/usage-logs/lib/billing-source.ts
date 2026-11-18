import type {
  PlanRecord,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'

interface BillingSourceVisibilityInput {
  isAdmin: boolean
  /** Admin view only: every system plan. */
  plans: PlanRecord[] | undefined
  /** Own-logs view only: active subscriptions returned by the self API. */
  subscriptions: UserSubscriptionRecord[] | undefined
}

/**
 * Every consume log carries `billing_source`, so the Wallet / Subscription
 * icon on the cost column is only a disambiguator. Admins see it when the
 * system has an enabled plan; own-logs views require an active subscription.
 */
export function shouldShowBillingSource(
  input: BillingSourceVisibilityInput
): boolean {
  if (input.isAdmin) {
    return (input.plans ?? []).some((record) => record.plan?.enabled === true)
  }
  return (input.subscriptions?.length ?? 0) > 0
}
