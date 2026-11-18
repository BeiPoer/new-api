import { createFileRoute } from '@tanstack/react-router'

import { PluginLoginCallback } from '@/features/channels/components/plugin-login-callback'

export const Route = createFileRoute(
  '/_authenticated/oauth/plugin/$key/callback'
)({
  component: PluginLoginCallbackPage,
})

function PluginLoginCallbackPage() {
  const { key } = Route.useParams()
  return <PluginLoginCallback key={key} pluginKey={key} />
}
