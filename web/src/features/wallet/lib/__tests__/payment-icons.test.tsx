import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { PAYMENT_ICON_COLORS, PAYMENT_TYPES } from '../../constants'
import { getPaymentIcon } from '../ui'

test.each([
  [PAYMENT_TYPES.ALIPAY, 'Alipay'],
  [PAYMENT_TYPES.WECHAT, 'WeChat'],
  [PAYMENT_TYPES.STRIPE, 'Stripe'],
])(
  'the built-in %s icon preserves the requested size and payment color',
  (type, label) => {
    render(getPaymentIcon(type, 'h-6 w-6'))
    const icon = screen.getByRole('img', { name: label })
    expect(icon).toHaveClass('h-6', 'w-6')
    expect(icon).toHaveStyle({ color: PAYMENT_ICON_COLORS[type] })
  }
)

test('an admin-configured Simple Icon still resolves through the lazy icon loader', async () => {
  render(
    getPaymentIcon(
      PAYMENT_TYPES.ALIPAY,
      'h-4 w-4',
      'SiAlipay',
      'Configured Alipay'
    )
  )
  const title = await screen.findByTitle('Configured Alipay')
  expect(title.closest('svg')).toHaveClass('h-4', 'w-4')
})
