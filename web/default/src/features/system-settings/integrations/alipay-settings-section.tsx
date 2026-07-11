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
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

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

export type AlipaySettingsValues = {
  AlipayEnabled: boolean
  AlipayAppID: string
  AlipayPrivateKey: string
  AlipayPublicKey: string
  AlipayNotifyURL: string
  AlipayReturnURL: string
  AlipaySubscriptionReturnURL: string
  AlipayMinTopUp: number
  AlipayExchangeRate: number
}

export type AlipaySettingsErrors = Partial<
  Record<keyof AlipaySettingsValues, string>
>

type AlipaySettingsSectionProps = {
  values: AlipaySettingsValues
  errors: AlipaySettingsErrors
  onValueChange: <K extends keyof AlipaySettingsValues>(
    key: K,
    value: AlipaySettingsValues[K]
  ) => void
}

function FieldHint(props: { children: ReactNode; error?: string }) {
  const { t } = useTranslation()

  if (props.error) {
    return <FieldError className='text-xs'>{t(props.error)}</FieldError>
  }

  return (
    <FieldDescription className='text-xs'>{props.children}</FieldDescription>
  )
}

export function AlipaySettingsSection(props: AlipaySettingsSectionProps) {
  const { t } = useTranslation()

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium'>{t('Enterprise Alipay')}</h3>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Direct integration with Alipay Open Platform using RSA2 signatures.'
          )}
        </p>
      </div>

      <Alert>
        <AlertTitle>{t('Default callback paths')}</AlertTitle>
        <AlertDescription className='space-y-1 text-xs'>
          <p>/api/user/alipay/notify</p>
          <p>/api/user/alipay/return</p>
          <p>/api/subscription/alipay/return</p>
        </AlertDescription>
      </Alert>

      <SettingsSwitchField
        checked={props.values.AlipayEnabled}
        onCheckedChange={(checked) =>
          props.onValueChange('AlipayEnabled', checked)
        }
        label={t('Enable Enterprise Alipay')}
        description={t(
          'Requires an Alipay Open Platform app ID, application private key, and Alipay public key.'
        )}
        className='py-0'
      />

      <FieldGroup className='grid gap-6 md:grid-cols-3'>
        <Field>
          <FieldLabel htmlFor='alipay-app-id'>{t('Alipay App ID')}</FieldLabel>
          <Input
            id='alipay-app-id'
            value={props.values.AlipayAppID}
            placeholder={t('App ID from Alipay Open Platform')}
            autoComplete='off'
            onChange={(event) =>
              props.onValueChange('AlipayAppID', event.target.value)
            }
          />
        </Field>

        <Field data-invalid={!!props.errors.AlipayMinTopUp}>
          <FieldLabel htmlFor='alipay-min-topup'>
            {t('Minimum Alipay recharge')}
          </FieldLabel>
          <Input
            id='alipay-min-topup'
            type='number'
            aria-invalid={!!props.errors.AlipayMinTopUp}
            min={1}
            step={1}
            value={props.values.AlipayMinTopUp}
            onChange={(event) =>
              props.onValueChange(
                'AlipayMinTopUp',
                event.target.value === '' ? 0 : event.target.valueAsNumber
              )
            }
          />
          <FieldHint error={props.errors.AlipayMinTopUp}>
            {t('Smallest balance amount users can recharge through Alipay')}
          </FieldHint>
        </Field>

        <Field data-invalid={!!props.errors.AlipayExchangeRate}>
          <FieldLabel htmlFor='alipay-exchange-rate'>
            {t('Alipay exchange rate (CNY/USD)')}
          </FieldLabel>
          <Input
            id='alipay-exchange-rate'
            type='number'
            aria-invalid={!!props.errors.AlipayExchangeRate}
            min={0.01}
            step={0.0001}
            value={props.values.AlipayExchangeRate}
            onChange={(event) =>
              props.onValueChange(
                'AlipayExchangeRate',
                event.target.value === '' ? 0 : event.target.valueAsNumber
              )
            }
          />
          <FieldHint error={props.errors.AlipayExchangeRate}>
            {t(
              'Used when balances are displayed in USD; CNY display charges 1:1.'
            )}
          </FieldHint>
        </Field>
      </FieldGroup>

      <FieldGroup className='grid gap-6 md:grid-cols-2'>
        <Field>
          <FieldLabel htmlFor='alipay-private-key'>
            {t('Application private key')}
          </FieldLabel>
          <Textarea
            id='alipay-private-key'
            rows={5}
            value={props.values.AlipayPrivateKey}
            placeholder={t('Enter new key to update')}
            autoComplete='new-password'
            className='font-mono text-xs'
            onChange={(event) =>
              props.onValueChange('AlipayPrivateKey', event.target.value)
            }
          />
          <FieldHint>
            {t(
              'Supports PKCS#1 or PKCS#8 PEM and Base64 DER. Leave blank unless updating.'
            )}
          </FieldHint>
        </Field>

        <Field>
          <FieldLabel htmlFor='alipay-public-key'>
            {t('Alipay public key')}
          </FieldLabel>
          <Textarea
            id='alipay-public-key'
            rows={5}
            value={props.values.AlipayPublicKey}
            placeholder={t('Enter new key to update')}
            autoComplete='new-password'
            className='font-mono text-xs'
            onChange={(event) =>
              props.onValueChange('AlipayPublicKey', event.target.value)
            }
          />
          <FieldHint>
            {t('Supports PEM and Base64 DER. Leave blank unless updating.')}
          </FieldHint>
        </Field>
      </FieldGroup>

      <FieldGroup className='grid gap-6 md:grid-cols-3'>
        <Field data-invalid={!!props.errors.AlipayNotifyURL}>
          <FieldLabel htmlFor='alipay-notify-url'>
            {t('Asynchronous notification URL')}
          </FieldLabel>
          <Input
            id='alipay-notify-url'
            type='url'
            aria-invalid={!!props.errors.AlipayNotifyURL}
            value={props.values.AlipayNotifyURL}
            placeholder='/api/user/alipay/notify'
            onChange={(event) =>
              props.onValueChange('AlipayNotifyURL', event.target.value)
            }
          />
          <FieldHint error={props.errors.AlipayNotifyURL}>
            {t('Leave blank to use the default callback path')}
          </FieldHint>
        </Field>

        <Field data-invalid={!!props.errors.AlipayReturnURL}>
          <FieldLabel htmlFor='alipay-return-url'>
            {t('Recharge return URL')}
          </FieldLabel>
          <Input
            id='alipay-return-url'
            type='url'
            aria-invalid={!!props.errors.AlipayReturnURL}
            value={props.values.AlipayReturnURL}
            placeholder='/api/user/alipay/return'
            onChange={(event) =>
              props.onValueChange('AlipayReturnURL', event.target.value)
            }
          />
          <FieldHint error={props.errors.AlipayReturnURL}>
            {t('Leave blank to use the default callback path')}
          </FieldHint>
        </Field>

        <Field data-invalid={!!props.errors.AlipaySubscriptionReturnURL}>
          <FieldLabel htmlFor='alipay-subscription-return-url'>
            {t('Subscription return URL')}
          </FieldLabel>
          <Input
            id='alipay-subscription-return-url'
            type='url'
            aria-invalid={!!props.errors.AlipaySubscriptionReturnURL}
            value={props.values.AlipaySubscriptionReturnURL}
            placeholder='/api/subscription/alipay/return'
            onChange={(event) =>
              props.onValueChange(
                'AlipaySubscriptionReturnURL',
                event.target.value
              )
            }
          />
          <FieldHint error={props.errors.AlipaySubscriptionReturnURL}>
            {t('Leave blank to use the default callback path')}
          </FieldHint>
        </Field>
      </FieldGroup>
    </div>
  )
}
