import { MoreHorizontal } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type DataTableRowActionMenuProps = {
  children: React.ReactNode
  ariaLabel: string
  trigger?: React.ReactElement
  contentClassName?: string
  modal?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DataTableRowActionMenu(props: DataTableRowActionMenuProps) {
  return (
    <DropdownMenu modal={props.modal} onOpenChange={props.onOpenChange}>
      <DropdownMenuTrigger
        render={
          props.trigger ?? (
            <Button
              variant='ghost'
              size='icon'
              className='data-popup-open:bg-muted'
            >
              <MoreHorizontal aria-hidden='true' />
            </Button>
          )
        }
        aria-label={props.ariaLabel}
      />
      <DropdownMenuContent
        align='end'
        className={cn('w-48', props.contentClassName)}
      >
        {props.children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
