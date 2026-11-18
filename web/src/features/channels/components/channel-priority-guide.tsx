import {
  ArrowDownToLine,
  CircleHelp,
  Layers,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { DataTableViewMode } from '@/components/data-table'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMediaQuery } from '@/hooks/use-media-query'

import { ChannelPriorityDemo } from './channel-priority-demo'

export function ChannelPriorityGuide(props: {
  open: boolean
  viewMode: DataTableViewMode
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [playback, setPlayback] = useState(0)
  const [demo, setDemo] = useState<'same' | 'insert'>('same')
  const [playing, setPlaying] = useState(true)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const nextDemo = useCallback(() => {
    setDemo((mode) => (mode === 'same' ? 'insert' : 'same'))
  }, [])
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDemo('same')
      setPlaying(true)
    }
    props.onOpenChange(open)
  }
  return (
    <Dialog
      open={props.open}
      onOpenChange={handleOpenChange}
      title={t('Drag to set channel priority')}
      description={t(
        'Move channels into a priority tier or between tiers. Priority values update automatically.'
      )}
      contentClassName='sm:max-w-lg'
      headerClassName='pr-5'
      trigger={
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='text-muted-foreground'
          aria-label={t('Drag mode help')}
          title={t('Drag mode help')}
        >
          <CircleHelp className='size-4' aria-hidden />
        </Button>
      }
      footerClassName='flex-row items-center justify-between sm:justify-between'
      footer={
        <>
          <div className='flex items-center gap-1'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => {
                setDemo('same')
                setPlaying(true)
                setPlayback((value) => value + 1)
              }}
            >
              <RotateCcw className='size-4' aria-hidden />
              {t('Replay drag demo')}
            </Button>
            {!reduced && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label={
                  playing ? t('Pause drag demo') : t('Resume drag demo')
                }
                title={playing ? t('Pause drag demo') : t('Resume drag demo')}
                onClick={() => setPlaying((value) => !value)}
              >
                {playing ? (
                  <Pause className='size-4' aria-hidden />
                ) : (
                  <Play className='size-4' aria-hidden />
                )}
              </Button>
            )}
          </div>
          <Button type='button' onClick={() => handleOpenChange(false)}>
            {t('Got it')}
          </Button>
        </>
      }
    >
      <Tabs
        value={demo}
        onValueChange={(value) => {
          if (value === 'same' || value === 'insert') setDemo(value)
        }}
        className='gap-3'
      >
        <TabsList
          aria-label={t('Drag mode help')}
          className='grid w-full grid-cols-2 group-data-horizontal/tabs:h-auto'
        >
          <TabsTrigger
            value='same'
            className='data-active:text-primary h-auto min-h-9 px-2 py-2 text-xs whitespace-normal'
          >
            <Layers className='size-4 shrink-0' aria-hidden />
            <span>{t('Join the same priority tier')}</span>
          </TabsTrigger>
          <TabsTrigger
            value='insert'
            className='h-auto min-h-9 px-2 py-2 text-xs whitespace-normal data-active:text-amber-700 dark:data-active:text-amber-400'
          >
            <ArrowDownToLine className='size-4 shrink-0' aria-hidden />
            <span>{t('Insert a new priority tier')}</span>
          </TabsTrigger>
        </TabsList>
        {(['same', 'insert'] as const).map((mode) => (
          <TabsContent key={mode} value={mode}>
            {props.open && demo === mode && (
              <ChannelPriorityDemo
                key={`${props.viewMode}:${mode}:${playback}`}
                viewMode={props.viewMode}
                mode={mode}
                playing={playing}
                onComplete={nextDemo}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
      <p className='text-muted-foreground mt-3 border-t pt-3 text-xs leading-5'>
        {t('Changes save on drop. You can undo the last move.')}
      </p>
    </Dialog>
  )
}
