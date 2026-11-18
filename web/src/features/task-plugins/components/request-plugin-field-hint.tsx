import { Info } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * A field's description behind an info icon, for list items and table
 * columns where a line under every field would crowd them.
 */
export function RequestPluginFieldHint(props: { text?: string }) {
  if (!props.text) return null
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type='button'
              aria-label={props.text}
              className='text-muted-foreground hover:text-foreground inline-flex rounded-sm'
            />
          }
        >
          <Info aria-hidden='true' className='size-3.5' />
        </TooltipTrigger>
        <TooltipContent className='max-w-64'>{props.text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
