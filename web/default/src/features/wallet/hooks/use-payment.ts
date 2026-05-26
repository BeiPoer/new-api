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
import { useState, useCallback } from 'react'
import i18next from 'i18next'
import { toast } from 'sonner'
import {
  calculateAlipayAmount,
  calculateAmount,
  calculateStripeAmount,
  calculateWaffoPancakeAmount,
  requestAlipayPayment,
  requestPayment,
  requestStripePayment,
  isApiSuccess,
} from '../api'
import {
  isEnterpriseAlipayPayment,
  isStripePayment,
  isWaffoPancakePayment,
  submitPaymentForm,
} from '../lib'
import type {
  AlipayPayMode,
  PaymentResponse,
  StripePaymentResponse,
} from '../types'

export interface AlipayQRCodePaymentState {
  payMode: AlipayPayMode
  qrCode: string
  payUrl?: string
}

// ============================================================================
// Payment Hook
// ============================================================================

export function usePayment() {
  const [amount, setAmount] = useState<number>(0)
  const [calculating, setCalculating] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [alipayQRCodePayment, setAlipayQRCodePayment] =
    useState<AlipayQRCodePaymentState | null>(null)

  // Calculate payment amount
  const calculatePaymentAmount = useCallback(
    async (topupAmount: number, paymentType: string, directCNY = false) => {
      try {
        setCalculating(true)

        const isAlipay = isEnterpriseAlipayPayment(paymentType)
        const isStripe = isStripePayment(paymentType)
        const isPancake = isWaffoPancakePayment(paymentType)
        const amountRequest = { amount: topupAmount, direct_cny: directCNY }
        const response = isAlipay
          ? await calculateAlipayAmount(amountRequest)
          : isStripe
            ? await calculateStripeAmount({ amount: topupAmount })
            : isPancake
              ? await calculateWaffoPancakeAmount({ amount: topupAmount })
              : await calculateAmount({ amount: topupAmount })

        if (isApiSuccess(response) && response.data) {
          const calculatedAmount = parseFloat(response.data)
          setAmount(calculatedAmount)
          return calculatedAmount
        }

        // Don't show error for calculation, just set to 0
        setAmount(0)
        return 0
      } catch (_error) {
        setAmount(0)
        return 0
      } finally {
        setCalculating(false)
      }
    },
    []
  )

  // Process payment
  const processPayment = useCallback(
    async (topupAmount: number, paymentType: string, directCNY = false) => {
      try {
        setProcessing(true)

        const isAlipay = isEnterpriseAlipayPayment(paymentType)
        const isStripe = isStripePayment(paymentType)
        const amount = Math.floor(topupAmount)

        const response = isAlipay
          ? await requestAlipayPayment({
              amount,
              payment_method: 'enterprise_alipay',
              direct_cny: directCNY,
            })
          : isStripe
            ? await requestStripePayment({
                amount,
                payment_method: 'stripe',
              })
            : await requestPayment({
                amount,
                payment_method: paymentType,
              })

        if (!isApiSuccess(response)) {
          toast.error(response.message || i18next.t('Payment request failed'))
          return false
        }

        if (isAlipay) {
          const alipayResponse = response as PaymentResponse
          if (
            alipayResponse.pay_mode === 'qrcode' &&
            alipayResponse.qr_code
          ) {
            setAlipayQRCodePayment({
              payMode: alipayResponse.pay_mode,
              qrCode: alipayResponse.qr_code,
              payUrl: alipayResponse.url,
            })
            toast.success(i18next.t('Scan the QR code to complete payment'))
            return true
          }
        }

        if (isStripe) {
          const stripeResponse = response as StripePaymentResponse
          if (stripeResponse.data?.pay_link) {
            window.open(stripeResponse.data.pay_link, '_blank')
            toast.success(i18next.t('Redirecting to payment page...'))
            return true
          }
        }

        if (!isStripe) {
          const paymentResponse = response as PaymentResponse
          if (paymentResponse.data && paymentResponse.url) {
            submitPaymentForm(paymentResponse.url, paymentResponse.data)
            toast.success(i18next.t('Redirecting to payment page...'))
            return true
          }
        }

        return false
      } catch (_error) {
        toast.error(i18next.t('Payment request failed'))
        return false
      } finally {
        setProcessing(false)
      }
    },
    []
  )

  return {
    amount,
    calculating,
    processing,
    alipayQRCodePayment,
    calculatePaymentAmount,
    processPayment,
    closeAlipayQRCodePayment: () => setAlipayQRCodePayment(null),
    setAmount,
  }
}
