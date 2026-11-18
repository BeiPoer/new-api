import { ArrowDownToLine, Layers } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { useChannelPriorityOrder } from '../hooks/use-channel-priority-order'
import type { Channel } from '../types'

export function ChannelPriorityDropHint(props: {
  container: HTMLElement | null
  order: ReturnType<typeof useChannelPriorityOrder>
  channels: Channel[]
}) {
  const { t, i18n } = useTranslation()
  const hover = useSyncExternalStore(
    props.order.previewStore.subscribe,
    props.order.previewStore.getSnapshot
  )
  if (!props.container || !hover.drop) return null
  const joining = hover.drop.position === 'same'
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const targetPriority =
    props.channels.find((item) => item.id === hover.drop?.target_id)
      ?.priority ?? 0
  const priority =
    hover.preview?.items.find((item) => item.id === hover.drop?.id)?.priority ??
    targetPriority
  let detail = t('Use the same priority as the highlighted channels')
  if (!joining) {
    detail = hover.preview
      ? t('New priority: {{priority}}', {
          priority: formatNumber(priority, locale),
        })
      : t('Calculating priority...')
  }
  return createPortal(
    <div
      data-priority-hint
      className={cn(
        'text-popover-foreground p-3',
        props.container.dataset.priorityView !== 'table' &&
          'bg-popover rounded-xl border shadow-xl'
      )}
    >
      <Badge
        variant={joining ? 'default' : 'warning'}
        className='h-auto min-h-7 w-full justify-start gap-2 rounded-lg px-2.5 py-1.5 text-sm leading-snug whitespace-normal'
      >
        {joining ? (
          <Layers aria-hidden className='shrink-0' />
        ) : (
          <ArrowDownToLine aria-hidden className='shrink-0' />
        )}
        <span>
          {joining
            ? t('Release to join priority {{priority}}', {
                priority: formatNumber(priority, locale),
              })
            : t('Release to insert a new priority tier')}
        </span>
      </Badge>
      <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
        {detail}
      </p>
    </div>,
    props.container
  )
}
