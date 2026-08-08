/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

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

    assert.equal(amount, 18.75)
    assert.deepEqual(calls, ['waffo:120'])
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

    assert.equal(amount, 120)
    assert.deepEqual(request, { amount: 120, direct_cny: true })
  })
})
