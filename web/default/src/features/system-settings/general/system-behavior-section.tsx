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
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useResetForm } from '../hooks/use-reset-form'
import { useUpdateOption } from '../hooks/use-update-option'

const behaviorSchema = z.object({
  DefaultCollapseSidebar: z.boolean(),
  DemoSiteEnabled: z.boolean(),
  SelfUseModeEnabled: z.boolean(),
  'general_setting.register_phone_enabled': z.boolean(),
  'general_setting.register_phone_required': z.boolean(),
})

type BehaviorFormValues = z.infer<typeof behaviorSchema>

type SystemBehaviorSectionProps = {
  defaultValues: BehaviorFormValues
}

export function SystemBehaviorSection({
  defaultValues,
}: SystemBehaviorSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const form = useForm({
    resolver: zodResolver(behaviorSchema),
    defaultValues,
  })

  useResetForm(form, defaultValues)

  const registerPhoneEnabled = form.watch(
    'general_setting.register_phone_enabled'
  )

  const onSubmit = async (data: BehaviorFormValues) => {
    const normalizedData = {
      ...data,
      'general_setting.register_phone_required':
        data['general_setting.register_phone_enabled'] &&
        data['general_setting.register_phone_required'],
    }
    const updates = Object.entries(normalizedData).filter(
      ([key]) =>
        normalizedData[key as keyof BehaviorFormValues] !==
        defaultValues[key as keyof BehaviorFormValues]
    )

    for (const [key] of updates) {
      await updateOption.mutateAsync({
        key,
        value: normalizedData[key as keyof BehaviorFormValues],
      })
    }
  }

  return (
    <SettingsSection title={t('System Behavior')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
          />
          <FormField
            control={form.control}
            name='DefaultCollapseSidebar'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Default Collapse Sidebar')}</FormLabel>
                  <FormDescription>
                    {t('Sidebar collapsed by default for new users')}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='DemoSiteEnabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Demo Site Mode')}</FormLabel>
                  <FormDescription>
                    {t('Enable demo mode with limited functionality')}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='SelfUseModeEnabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Self-Use Mode')}</FormLabel>
                  <FormDescription>
                    {t('Optimize system for self-hosted single-user usage')}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='general_setting.register_phone_enabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>
                    {t('Enable phone number field during registration')}
                  </FormLabel>
                  <FormDescription>
                    {t(
                      'Show the phone number field on the password registration form'
                    )}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      if (!checked) {
                        form.setValue(
                          'general_setting.register_phone_required',
                          false,
                          { shouldDirty: true }
                        )
                      }
                    }}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='general_setting.register_phone_required'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>
                    {t('Require phone number during registration')}
                  </FormLabel>
                  <FormDescription>
                    {t(
                      'When enabled, users must provide a valid phone number to register'
                    )}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={registerPhoneEnabled && field.value}
                    disabled={!registerPhoneEnabled}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
