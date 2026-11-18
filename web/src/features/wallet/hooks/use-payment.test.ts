import { describe, expect, test } from 'vitest'

import { PAYMENT_TYPES } from '../constants'
import { requestPaymentAmount } from './use-payment'

describe('payment amount routing', () => {
  test('uses the dedicated Waffo amount calculator', async () => {
    const calls: string[] = []
    const amount = await requestPaymentAmount(120, PAYMENT_TYPES.WAFFO, {
      regular: async () => {
        calls.push('regular')
        return { success: true, data: '1' }
      },
      alipay: async () => {
        calls.push('alipay')
        return { success: true, data: '5' }
      },
      stripe: async () => {
        calls.push('stripe')
        return { success: true, data: '2' }
      },
      waffo: async (request) => {
        calls.push(`waffo:${request.amount}`)
        return { success: true, data: '18.75' }
      },
      waffoPancake: async () => {
        calls.push('pancake')
        return { success: true, data: '4' }
      },
    })

    expect(amount).toBe(18.75)
    expect(calls).toEqual(['waffo:120'])
  })

  test('passes the direct CNY flag to the enterprise Alipay calculator', async () => {
    let request: { amount: number; direct_cny?: boolean } | undefined
    const amount = await requestPaymentAmount(
      120,
      PAYMENT_TYPES.ENTERPRISE_ALIPAY,
      {
        regular: async () => ({ success: true, data: '1' }),
        alipay: async (value) => {
          request = value
          return { success: true, data: '120' }
        },
        stripe: async () => ({ success: true, data: '2' }),
        waffo: async () => ({ success: true, data: '3' }),
        waffoPancake: async () => ({ success: true, data: '4' }),
      },
      true
    )

    expect(amount).toBe(120)
    expect(request).toEqual({ amount: 120, direct_cny: true })
  })
})
