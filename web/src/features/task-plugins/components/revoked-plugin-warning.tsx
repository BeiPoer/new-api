import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { resolveLocalizedText } from '@/lib/localized-text'

import type { MarketplaceRevokedEntry } from '../types'

/** Tells the administrator that the installed code was taken down, and why. */
export function RevokedPluginWarning(props: {
  entry?: MarketplaceRevokedEntry
}) {
  const { t, i18n } = useTranslation()
  if (!props.entry) return null
  const reason = resolveLocalizedText(props.entry.reason, i18n.language)
  return (
    <p
      role='alert'
      className='text-destructive flex min-w-60 items-start gap-1.5 text-sm font-medium whitespace-normal'
    >
      <TriangleAlert className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
      <span className='min-w-0'>
        {t('This version was taken down from community plugins.')}
        {reason && <> {t('Reason: {{reason}}', { reason })}</>}
      </span>
    </p>
  )
}
