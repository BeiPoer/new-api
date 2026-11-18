import React, { useCallback, useMemo, useState } from 'react'

import {
  SecureVerificationDialog,
  useSecureVerification,
} from '@/features/auth/secure-verification'
import useDialogState from '@/hooks/use-dialog'

import type { User, UsersDialogType } from '../types'

type UsersContextType = {
  open: UsersDialogType | null
  setOpen: (str: UsersDialogType | null) => void
  currentRow: User | null
  setCurrentRow: React.Dispatch<React.SetStateAction<User | null>>
  refreshTrigger: number
  triggerRefresh: () => void
  /** Step-up ceremony shared by every risky user-management action. */
  requestVerification: ReturnType<
    typeof useSecureVerification
  >['requestVerification']
  /** True while the step-up dialog is showing; confirm dialogs yield to it. */
  verificationActive: boolean
}

const UsersContext = React.createContext<UsersContextType | null>(null)

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<UsersDialogType>(null)
  const [currentRow, setCurrentRow] = useState<User | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  // The dialog mounts once here; consumers only receive the proof token, and
  // the memoized value keeps dialog keystrokes from re-rendering the table.
  const verification = useSecureVerification()
  const requestVerification = verification.requestVerification
  const verificationActive = verification.isActive

  const triggerRefresh = useCallback(
    () => setRefreshTrigger((prev) => prev + 1),
    []
  )

  const value = useMemo(
    () => ({
      open,
      setOpen,
      currentRow,
      setCurrentRow,
      refreshTrigger,
      triggerRefresh,
      requestVerification,
      verificationActive,
    }),
    [
      open,
      setOpen,
      currentRow,
      refreshTrigger,
      triggerRefresh,
      requestVerification,
      verificationActive,
    ]
  )

  return (
    <UsersContext value={value}>
      {children}
      <SecureVerificationDialog {...verification.dialogProps} />
    </UsersContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUsers = () => {
  const usersContext = React.useContext(UsersContext)

  if (!usersContext) {
    throw new Error('useUsers has to be used within <UsersContext>')
  }

  return usersContext
}
