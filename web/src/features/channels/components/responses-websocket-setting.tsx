import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'

import { CHANNEL_TYPE_ADVANCED_CUSTOM } from '../lib/advanced-custom'
import type { ChannelFormValues } from '../lib/channel-form'
import { supportsResponsesWebSocket } from '../lib/responses-websocket'

export function ResponsesWebSocketSetting(props: {
  channelType: number
  /** Overrides the channel type rule, e.g. for a plugin that can serve it. */
  supported?: boolean
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const form = useFormContext<ChannelFormValues>()
  if (!(props.supported ?? supportsResponsesWebSocket(props.channelType))) {
    return null
  }

  return (
    <FormField
      control={form.control}
      name='responses_websocket_enabled'
      render={({ field }) => (
        <FormItem className='flex items-center justify-between gap-4 px-4 py-3'>
          <div className='space-y-0.5'>
            <FormLabel>{t('Enable Responses WebSocket')}</FormLabel>
            <FormDescription>
              {t(
                'Enable only if the upstream supports Responses WebSocket. HTTP requests are unaffected when disabled.'
              )}
              {props.channelType === CHANNEL_TYPE_ADVANCED_CUSTOM && (
                <>
                  {' '}
                  {t(
                    'For advanced custom channels this applies only to /v1/responses routes without protocol conversion.'
                  )}
                </>
              )}
            </FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={field.value === true}
              onCheckedChange={field.onChange}
              disabled={props.disabled}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
