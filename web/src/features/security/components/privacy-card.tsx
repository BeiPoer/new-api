import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { TitledCard } from '@/components/ui/titled-card'
import { updateUserSettings } from '@/features/profile/api'
import { parseUserSettings } from '@/features/profile/lib/format'
import type { UserProfile } from '@/features/profile/types'
import { handleServerError } from '@/lib/handle-server-error'
import { createServerError } from '@/lib/server-error-message'

type PrivacyCardProps = {
  profile: UserProfile
  onUpdate: () => void
}

export function PrivacyCard(props: PrivacyCardProps) {
  const { t } = useTranslation()
  const [recordIpLog, setRecordIpLog] = useState(() =>
    Boolean(parseUserSettings(props.profile.setting).record_ip_log)
  )
  useEffect(() => {
    setRecordIpLog(
      Boolean(parseUserSettings(props.profile.setting).record_ip_log)
    )
  }, [props.profile.setting])

  const save = useMutation({
    mutationFn: async () => {
      const response = await updateUserSettings({ record_ip_log: recordIpLog })
      if (!response.success) {
        throw createServerError(response, t('Failed to update settings'))
      }
    },
    onSuccess: () => {
      toast.success(t('Settings updated successfully'))
      props.onUpdate()
    },
    onError: (error) =>
      handleServerError(error, t('Failed to update settings')),
  })

  return (
    <TitledCard
      title={t('Record IP Address')}
      description={t('Log IP address for usage and error logs')}
      disableHoverEffect
    >
      <div className='flex items-center justify-between gap-4'>
        <Label htmlFor='security-record-ip'>{t('Record IP Address')}</Label>
        <Switch
          id='security-record-ip'
          checked={recordIpLog}
          onCheckedChange={setRecordIpLog}
          disabled={save.isPending}
        />
      </div>
      <div className='mt-4 flex justify-end'>
        <Button
          type='button'
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending && <Loader2 className='size-4 animate-spin' />}
          {save.isPending ? t('Saving...') : t('Save Settings')}
        </Button>
      </div>
    </TitledCard>
  )
}
