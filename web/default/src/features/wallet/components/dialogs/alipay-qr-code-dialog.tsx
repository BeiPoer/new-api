/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AlipayQRCodeDialogProps {
  open: boolean
  qrCode: string
  onOpenChange: (open: boolean) => void
  onOpenBilling?: () => void
}

export function AlipayQRCodeDialog({
  open,
  qrCode,
  onOpenChange,
  onOpenBilling,
}: AlipayQRCodeDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>{t('Scan with Alipay')}</DialogTitle>
          <DialogDescription>
            {t('Use Alipay to scan the QR code and complete payment')}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col items-center gap-3 py-2'>
          <div className='rounded-lg border bg-white p-4'>
            {qrCode ? <QRCodeSVG value={qrCode} size={220} /> : null}
          </div>
          <p className='text-muted-foreground text-center text-sm'>
            {t('After payment succeeds, you can refresh billing history')}
          </p>
        </div>

        <DialogFooter
          className={
            onOpenBilling ? 'grid grid-cols-2 gap-2 sm:flex' : undefined
          }
        >
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            {t('Close')}
          </Button>
          {onOpenBilling ? (
            <Button
              type='button'
              onClick={() => {
                onOpenChange(false)
                onOpenBilling()
              }}
            >
              {t('Billing History')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
