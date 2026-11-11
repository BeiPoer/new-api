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
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { PaymentConfirmDialog } from '../components/dialogs/payment-confirm-dialog'
import { RechargeFormCard } from '../components/recharge-form-card'
import { usePayment } from '../hooks/use-payment'
import { getDefaultPaymentType, getMinTopupAmount } from '../lib/payment'
import type { TopupInfo } from '../types'

const topupInfo: TopupInfo = {
  enable_online_topup: false,
  enable_stripe_topup: false,
  enable_binance_pay_topup: true,
  binance_pay_min_topup: 5,
  pay_methods: [{ name: 'Binance Pay', type: 'binance_pay', min_topup: 5 }],
  min_topup: 1,
  stripe_min_topup: 1,
  amount_options: [5, 10],
  discount: {},
}

describe('Binance Pay recharge', () => {
  test('uses Binance Pay minimums and exposes its recharge button when it is the only provider', async () => {
    const select = vi.fn()
    render(
      <RechargeFormCard
        topupInfo={topupInfo}
        presetAmounts={[]}
        selectedPreset={null}
        onSelectPreset={vi.fn()}
        topupAmount={5}
        onTopupAmountChange={vi.fn()}
        paymentAmount={5}
        calculating={false}
        onPaymentMethodSelect={select}
        paymentLoading={null}
        redemptionCode=''
        onRedemptionCodeChange={vi.fn()}
        onRedeem={vi.fn()}
        redeeming={false}
      />
    )
    expect(getDefaultPaymentType(topupInfo)).toBe('binance_pay')
    expect(getMinTopupAmount(topupInfo)).toBe(5)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Binance Pay' }))
    expect(select).toHaveBeenCalledWith(topupInfo.pay_methods[0])
  })

  test('quotes and opens the dedicated Binance checkout', async () => {
    const request = vi
      .spyOn(api, 'post')
      .mockResolvedValueOnce({ data: { success: true, data: '11.25' } })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            pay_link: 'https://pay.binance.com/checkout/test',
            order_id: 'BP123',
          },
        },
      })
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const { result } = renderHook(() => usePayment())
    await act(async () => {
      expect(
        await result.current.calculatePaymentAmount(10, 'binance_pay')
      ).toBe(11.25)
      expect(await result.current.processPayment(10, 'binance_pay')).toBe(true)
    })
    expect(request).toHaveBeenNthCalledWith(1, '/api/user/binance-pay/amount', {
      amount: 10,
    })
    expect(request).toHaveBeenNthCalledWith(2, '/api/user/binance-pay/pay', {
      amount: 10,
    })
    expect(open).toHaveBeenCalledWith(
      'https://pay.binance.com/checkout/test',
      '_blank',
      'noopener,noreferrer'
    )
  })

  test('does not redirect when the backend denies access or a network request fails', async () => {
    vi.spyOn(api, 'post')
      .mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Binance Pay is not available for this user',
        },
      })
      .mockRejectedValueOnce(new Error('offline'))
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const { result } = renderHook(() => usePayment())
    await act(async () => {
      expect(await result.current.processPayment(10, 'binance_pay')).toBe(false)
      expect(await result.current.processPayment(10, 'binance_pay')).toBe(false)
    })
    expect(open).not.toHaveBeenCalled()
    expect(result.current.processing).toBe(false)
  })

  test('shows USDT amounts in payment confirmation', () => {
    render(
      <PaymentConfirmDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={10}
        paymentAmount={11.25}
        paymentMethod={topupInfo.pay_methods[0]}
        calculating={false}
        processing={false}
      />
    )
    expect(screen.getByText('11.25 USDT')).toBeVisible()
  })
})
