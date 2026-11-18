import { toast } from 'sonner'

import type { ModelPricingIssue } from '@/features/system-settings/models/pricing-issues'

import { PricingIssueList } from '../components/pricing-issue-list'

/**
 * Confirms a plugin change. When the serving plugin cannot charge some of its
 * models, the toast lists them instead of reporting plain success.
 */
export function toastPluginChange(
  title: string,
  issues: ModelPricingIssue[] | null | undefined
) {
  if (!issues?.length) {
    toast.success(title)
    return
  }
  toast.warning(title, { description: <PricingIssueList issues={issues} /> })
}
