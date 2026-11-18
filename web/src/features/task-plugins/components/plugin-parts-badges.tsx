import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

/**
 * Tags for the parts of a plugin: the task part, the model provider part, an
 * account sign-in in place of a key, and request processing. Lists split by
 * kind leave out the tag of the kind being shown.
 */
export function PluginPartsBadges(props: {
  task?: boolean
  provider?: boolean
  login?: boolean
  transform?: boolean
}) {
  const { t } = useTranslation()
  return (
    <>
      {props.task && <Badge variant='outline'>{t('Task')}</Badge>}
      {props.provider && <Badge variant='outline'>{t('Channel')}</Badge>}
      {props.login && <Badge variant='outline'>{t('Account login')}</Badge>}
      {props.transform && (
        <Badge variant='outline'>{t('Request processing')}</Badge>
      )}
    </>
  )
}
