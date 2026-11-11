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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'

import { BinancePaySettingsSection } from '../binance-pay-settings-section'
import { isValidBinancePayUserIDs } from '../binance-pay-validation'

function BinancePaySettingsFixture() {
  const [values, setValues] = useState({
    BinancePayEnabled: false,
    BinancePayAPIKey: '',
    BinancePaySecretKey: '',
    BinancePayAllowedUserIDs: '[]',
    BinancePayUnitPrice: 1,
    BinancePayMinTopUp: 1,
  })
  return (
    <BinancePaySettingsSection
      values={values}
      errors={
        isValidBinancePayUserIDs(values.BinancePayAllowedUserIDs)
          ? {}
          : {
              BinancePayAllowedUserIDs: {
                type: 'validate',
                message:
                  'Enter a JSON array of positive user IDs, for example [1, 42]',
              },
            }
      }
      onValueChange={(key, value) =>
        setValues((previous) => ({ ...previous, [key]: value }))
      }
    />
  )
}

describe('Binance Pay access settings', () => {
  test.each(['[]', '[1]', '[1, 42, 9007199254740991]'])(
    'accepts the user ID list %s',
    (value) => {
      expect(isValidBinancePayUserIDs(value)).toBe(true)
    }
  )

  test.each([
    '',
    'null',
    '{}',
    '[0]',
    '[-1]',
    '[1.5]',
    '["42"]',
    '[9007199254740992]',
  ])('rejects invalid user ID list %s', (value) => {
    expect(isValidBinancePayUserIDs(value)).toBe(false)
  })

  test('allows keyboard toggling and editing access while keeping credentials masked', async () => {
    const user = userEvent.setup()
    render(<BinancePaySettingsFixture />)
    const toggle = screen.getByRole('switch', { name: 'Enable Binance Pay' })
    toggle.focus()
    await user.keyboard(' ')
    expect(toggle).toBeChecked()

    const ids = screen.getByRole('textbox', { name: 'Allowed user IDs' })
    await user.clear(ids)
    await user.paste('[1, 42]')
    expect(ids).toHaveValue('[1, 42]')
    expect(ids).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Secret Key')).toHaveAttribute(
      'type',
      'password'
    )
  })

  test('marks malformed IDs invalid and explains the expected format', async () => {
    const user = userEvent.setup()
    render(<BinancePaySettingsFixture />)
    const ids = screen.getByRole('textbox', { name: 'Allowed user IDs' })
    await user.clear(ids)
    await user.paste('[0]')
    expect(ids).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText(
        'Enter a JSON array of positive user IDs, for example [1, 42]'
      )
    ).toBeVisible()
  })
})
