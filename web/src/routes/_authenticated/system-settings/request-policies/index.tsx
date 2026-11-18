import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/system-settings/request-policies/'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/system-settings/request-policies/$section',
      params: { section: 'routing' },
      replace: true,
    })
  },
})
