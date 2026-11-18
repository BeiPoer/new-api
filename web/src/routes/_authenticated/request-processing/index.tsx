import { createFileRoute, redirect } from '@tanstack/react-router'

import { RequestProcessing } from '@/features/request-processing'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/request-processing/')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()
    if (auth.user?.role !== ROLE.SUPER_ADMIN) throw redirect({ to: '/403' })
  },
  component: RequestProcessing,
})
