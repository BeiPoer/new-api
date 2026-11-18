import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AccessTokenDialog(props: {
  token: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
      title={t('Access tokens')}
      description={t('Copy this token now. It will not be shown again.')}
      contentClassName='sm:max-w-md'
      contentHeight='auto'
      footer={<Button onClick={props.onClose}>{t('Close')}</Button>}
    >
      <div className='space-y-2 py-2'>
        <Label htmlFor='generated-access-token'>{t('Token')}</Label>
        <div className='flex gap-2'>
          <Input
            id='generated-access-token'
            value={props.token}
            readOnly
            autoComplete='off'
            className='font-mono text-xs'
          />
          <CopyButton
            value={props.token}
            variant='outline'
            tooltip={t('Copy token')}
            aria-label={t('Copy token')}
          />
        </div>
      </div>
    </Dialog>
  )
}
