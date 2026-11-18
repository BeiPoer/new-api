import { useTranslation } from 'react-i18next'

import {
  PRICING_ISSUE_REASONS,
  type ModelPricingIssue,
} from '@/features/system-settings/models/pricing-issues'

/** A plugin reports one issue per model; a long catalog stays readable. */
const VISIBLE_ISSUES = 5

type PricingIssueListProps = {
  issues: ModelPricingIssue[]
}

/** The models whose price a plugin change left without a usable price. */
export function PricingIssueList(props: PricingIssueListProps) {
  const { t } = useTranslation()
  const hidden = props.issues.length - VISIBLE_ISSUES
  return (
    <div className='flex flex-col gap-0.5'>
      <p>{t('Prices of these models need attention:')}</p>
      <ul>
        {props.issues.slice(0, VISIBLE_ISSUES).map((issue) => (
          <li key={`${issue.model_name}:${issue.plugin_key}`}>
            {t('{{name}}: {{reason}}', {
              name: issue.model_name,
              reason: t(PRICING_ISSUE_REASONS[issue.reason]),
            })}
          </li>
        ))}
      </ul>
      {hidden > 0 && <p>{t('And {{count}} more models', { count: hidden })}</p>}
    </div>
  )
}
