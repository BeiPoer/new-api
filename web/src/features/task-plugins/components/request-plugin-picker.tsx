import { useTranslation } from 'react-i18next'

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item'
import type { TaskPluginOption } from '@/features/channels/api'
import { resolveLocalizedText } from '@/lib/localized-text'

import { localizedPluginName } from '../lib/plugin-name'
import {
  RequestPluginIconTile,
  RequestPluginRunLine,
} from './request-plugin-summary'

type RequestPluginPickerProps = {
  plugins: TaskPluginOption[]
  /** How many instances each plugin already has, by plugin key. */
  instanceCounts: Record<string, number>
  onPick: (key: string) => void
}

/** The first step of adding an instance: one card per plugin. */
export function RequestPluginPicker(props: RequestPluginPickerProps) {
  const { t, i18n } = useTranslation()
  if (props.plugins.length === 0) {
    return (
      <p className='text-muted-foreground py-10 text-center text-sm'>
        {t('No request processing plugins installed')}
      </p>
    )
  }
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {props.plugins.map((plugin) => {
        const count = props.instanceCounts[plugin.key] ?? 0
        return (
          <Item
            key={plugin.key}
            variant='outline'
            render={<button type='button' />}
            className='hover:bg-muted/40 hover:border-foreground/15 items-start gap-4 p-4 text-left'
            onClick={() => props.onPick(plugin.key)}
          >
            <RequestPluginIconTile plugin={plugin} />
            <ItemContent className='min-w-0 gap-1'>
              <ItemTitle className='w-full justify-between'>
                {localizedPluginName(plugin, i18n.language)}
                {count > 0 && (
                  <span className='text-muted-foreground text-xs font-normal'>
                    {t('{{count}} added', { count })}
                  </span>
                )}
              </ItemTitle>
              <ItemDescription className='line-clamp-2 text-[13px]'>
                {resolveLocalizedText(plugin.description, i18n.language)}
              </ItemDescription>
              <RequestPluginRunLine plugin={plugin} className='pt-1.5' />
            </ItemContent>
          </Item>
        )
      })}
    </div>
  )
}
