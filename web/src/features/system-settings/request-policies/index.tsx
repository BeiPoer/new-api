import { SettingsPage } from '../components/settings-page'
import { defaultRequestPolicySettings } from './defaults'
import {
  getPolicySectionContent,
  getPolicySectionMeta,
} from './section-registry'

export function RequestPolicies() {
  return (
    <SettingsPage
      routePath='/_authenticated/system-settings/request-policies/$section'
      defaultSettings={defaultRequestPolicySettings}
      defaultSection='routing'
      getSectionContent={getPolicySectionContent}
      getSectionMeta={getPolicySectionMeta}
    />
  )
}
