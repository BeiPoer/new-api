import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'

import { PRICING_ISSUE_REASONS, type ModelPricingIssue } from './pricing-issues'

type ModelPricingIssueSummaryProps = {
  count: number
  showingAttention: boolean
  onReview: () => void
  onShowAll: () => void
}

export function ModelPricingIssueSummary(props: ModelPricingIssueSummaryProps) {
  const { t, i18n } = useTranslation()
  if (props.count === 0) return null

  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)

  return (
    <Alert
      role='status'
      aria-label={t('Price needs attention')}
      className='border-warning/40 bg-warning/5 shrink-0'
    >
      <AlertTriangle aria-hidden='true' className='text-warning' />
      <AlertTitle>
        {t('Models needing price updates: {{modelCount}}', {
          modelCount: formatNumber(props.count, locale),
        })}
      </AlertTitle>
      <AlertDescription className='flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='min-w-0'>
          {t(
            'These models have missing or outdated plugin prices. Select a model to see what needs to change.'
          )}
        </p>
        <div className='flex shrink-0 flex-wrap gap-2'>
          {props.showingAttention && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={props.onShowAll}
            >
              {t('Show all models')}
            </Button>
          )}
          <Button type='button' size='sm' onClick={props.onReview}>
            {t('Review prices')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

export function ModelPricingIssueDetails(props: {
  issues: ModelPricingIssue[]
}) {
  const { t } = useTranslation()
  if (props.issues.length === 0) return null

  const instructions: Record<ModelPricingIssue['reason'], string> = {
    unconfigured: t(
      'Select this plugin below, set a price for this model, then save.'
    ),
    incompatible: t(
      'Select this plugin below and reconfigure its price using the current billing fields, then save.'
    ),
    stale: t('Select this plugin below, remove its saved price, then save.'),
  }

  return (
    <Alert role='note' aria-label={t('Pricing changes needed')}>
      <AlertTriangle aria-hidden='true' className='text-warning' />
      <AlertTitle>{t('Pricing changes needed')}</AlertTitle>
      <AlertDescription>
        <ul className='flex min-w-0 flex-col gap-3 [overflow-wrap:anywhere]'>
          {props.issues.map((issue) => (
            <li key={issue.plugin_key}>
              <p className='text-foreground font-medium'>
                {t('{{name}}: {{reason}}', {
                  name: issue.plugin_name,
                  reason: t(PRICING_ISSUE_REASONS[issue.reason]),
                })}
              </p>
              <p>{instructions[issue.reason]}</p>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
