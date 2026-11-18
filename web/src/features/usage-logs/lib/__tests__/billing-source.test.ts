import { describe, expect, test } from 'vitest'

import type {
  PlanRecord,
  SubscriptionPlan,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'

import { shouldShowBillingSource } from '../billing-source'

function plan(enabled: boolean): PlanRecord {
  return { plan: { id: 1, enabled } as SubscriptionPlan }
}

const active: UserSubscriptionRecord[] = [
  {
    subscription: {
      id: 7,
      user_id: 3,
      plan_id: 1,
      status: 'active',
      start_time: 0,
      end_time: 1,
      amount_total: 100,
      amount_used: 100,
    },
  },
]

describe('billing source visibility', () => {
  test.each([
    { name: 'no plans exist', plans: [] },
    { name: 'all plans are disabled', plans: [plan(false), plan(false)] },
    { name: 'plans failed to load', plans: undefined },
  ])('hides icons for admins when $name', ({ plans }) => {
    expect(
      shouldShowBillingSource({
        isAdmin: true,
        plans,
        subscriptions: undefined,
      })
    ).toBe(false)
  })

  test('shows icons for admins when at least one plan is enabled', () => {
    expect(
      shouldShowBillingSource({
        isAdmin: true,
        plans: [plan(false), plan(true)],
        subscriptions: undefined,
      })
    ).toBe(true)
  })

  test('hides icons for a user without an active subscription', () => {
    expect(
      shouldShowBillingSource({
        isAdmin: false,
        plans: [plan(true)],
        subscriptions: [],
      })
    ).toBe(false)
  })

  test('shows icons for an active subscription even when the system has no enabled plans', () => {
    expect(
      shouldShowBillingSource({
        isAdmin: false,
        plans: [],
        subscriptions: active,
      })
    ).toBe(true)
  })

  test('shows icons for a user with an active subscription when enabled plans exist', () => {
    expect(
      shouldShowBillingSource({
        isAdmin: false,
        plans: [plan(true)],
        subscriptions: active,
      })
    ).toBe(true)
  })
})
