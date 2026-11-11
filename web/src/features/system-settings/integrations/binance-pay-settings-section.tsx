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
import type { FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { PasswordInput } from '@/components/password-input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { SettingsSwitchField } from '../components/settings-form-layout'

type BinancePaySettingsValues = {
  BinancePayEnabled: boolean
  BinancePayAPIKey: string
  BinancePaySecretKey: string
  BinancePayAllowedUserIDs: string
  BinancePayUnitPrice: number
  BinancePayMinTopUp: number
}

type BinancePaySettingsSectionProps = {
  values: BinancePaySettingsValues
  errors: FieldErrors<BinancePaySettingsValues>
  onValueChange: <K extends keyof BinancePaySettingsValues>(
    key: K,
    value: BinancePaySettingsValues[K]
  ) => void
}

export function BinancePaySettingsSection(
  props: BinancePaySettingsSectionProps
) {
  const { t } = useTranslation()

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium'>{t('Binance Pay')}</h3>
        <p className='text-muted-foreground text-sm'>
          {t('Accept USDT payments through Binance Pay merchant checkout.')}
        </p>
      </div>
      <Alert>
        <AlertTitle>{t('Default callback paths')}</AlertTitle>
        <AlertDescription className='text-xs'>
          <p>/api/binance-pay/webhook</p>
          <p>
            {t('Binance Pay requires HTTPS server and callback addresses.')}
          </p>
        </AlertDescription>
      </Alert>
      <SettingsSwitchField
        controlId='binance-pay-enabled'
        checked={props.values.BinancePayEnabled}
        onCheckedChange={(checked) =>
          props.onValueChange('BinancePayEnabled', checked)
        }
        label={t('Enable Binance Pay')}
        description={t(
          'Only the listed site user IDs can use this payment method. An empty list disables access for everyone.'
        )}
        className='py-0'
      />
      <FieldGroup className='grid gap-6 md:grid-cols-2'>
        <Field>
          <FieldLabel htmlFor='binance-pay-api-key'>{t('API Key')}</FieldLabel>
          <PasswordInput
            id='binance-pay-api-key'
            autoComplete='new-password'
            value={props.values.BinancePayAPIKey}
            placeholder={t('Leave blank to keep unchanged')}
            onChange={(event) =>
              props.onValueChange('BinancePayAPIKey', event.target.value)
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='binance-pay-secret-key'>
            {t('Secret Key')}
          </FieldLabel>
          <PasswordInput
            id='binance-pay-secret-key'
            autoComplete='new-password'
            value={props.values.BinancePaySecretKey}
            placeholder={t('Leave blank to keep unchanged')}
            onChange={(event) =>
              props.onValueChange('BinancePaySecretKey', event.target.value)
            }
          />
        </Field>
        <Field data-invalid={!!props.errors.BinancePayUnitPrice}>
          <FieldLabel htmlFor='binance-pay-unit-price'>
            {t('Unit price (USDT / USD balance)')}
          </FieldLabel>
          <Input
            id='binance-pay-unit-price'
            type='number'
            min={0.0001}
            step={0.0001}
            aria-invalid={!!props.errors.BinancePayUnitPrice}
            value={props.values.BinancePayUnitPrice}
            onChange={(event) =>
              props.onValueChange(
                'BinancePayUnitPrice',
                event.target.value === '' ? 0 : event.target.valueAsNumber
              )
            }
          />
          {props.errors.BinancePayUnitPrice?.message && (
            <FieldError>
              {t(props.errors.BinancePayUnitPrice.message)}
            </FieldError>
          )}
        </Field>
        <Field data-invalid={!!props.errors.BinancePayMinTopUp}>
          <FieldLabel htmlFor='binance-pay-min-topup'>
            {t('Minimum recharge')}
          </FieldLabel>
          <Input
            id='binance-pay-min-topup'
            type='number'
            min={1}
            step={1}
            aria-invalid={!!props.errors.BinancePayMinTopUp}
            value={props.values.BinancePayMinTopUp}
            onChange={(event) =>
              props.onValueChange(
                'BinancePayMinTopUp',
                event.target.value === '' ? 0 : event.target.valueAsNumber
              )
            }
          />
          {props.errors.BinancePayMinTopUp?.message && (
            <FieldError>
              {t(props.errors.BinancePayMinTopUp.message)}
            </FieldError>
          )}
        </Field>
      </FieldGroup>
      <Field data-invalid={!!props.errors.BinancePayAllowedUserIDs}>
        <FieldLabel htmlFor='binance-pay-allowed-users'>
          {t('Allowed user IDs')}
        </FieldLabel>
        <Textarea
          id='binance-pay-allowed-users'
          rows={3}
          className='font-mono'
          placeholder='[1, 42, 100]'
          aria-invalid={!!props.errors.BinancePayAllowedUserIDs}
          value={props.values.BinancePayAllowedUserIDs}
          onChange={(event) =>
            props.onValueChange('BinancePayAllowedUserIDs', event.target.value)
          }
        />
        <FieldDescription>
          {t(
            'Enter site user IDs as a JSON array, for example [1, 42]. These are not Binance account IDs.'
          )}
        </FieldDescription>
        {props.errors.BinancePayAllowedUserIDs?.message && (
          <FieldError>
            {t(props.errors.BinancePayAllowedUserIDs.message)}
          </FieldError>
        )}
      </Field>
    </div>
  )
}
