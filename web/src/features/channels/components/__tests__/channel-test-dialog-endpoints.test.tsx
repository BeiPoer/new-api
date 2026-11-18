import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import type { TaskPluginOption } from '../../api'
import { channelSchema, type Channel } from '../../types'
import { ChannelsProvider, useChannels } from '../channels-provider'
import { ChannelTestDialog } from '../dialogs/channel-test-dialog'

const originalAuth = useAuthStore.getState().auth
const pluginOptions: TaskPluginOption[] = [
  {
    key: 'relay-x',
    name: 'Relay X',
    models: ['model-a'],
    provider: true,
    relayPaths: ['/v1/responses', '/v1/messages'],
  },
]

function OpenDialog(props: { channel: Channel }) {
  const { setCurrentRow } = useChannels()
  useEffect(() => {
    setCurrentRow(props.channel)
  }, [props.channel, setCurrentRow])
  return <ChannelTestDialog open onOpenChange={() => {}} />
}

function channel(type: number, setting = '') {
  return channelSchema.parse({
    id: 9,
    name: 'Test channel',
    type,
    key: '',
    status: 1,
    created_time: 1,
    test_time: 0,
    response_time: 0,
    balance_updated_time: 0,
    models: 'model-a',
    setting,
  })
}

beforeEach(() => {
  useAuthStore.setState({
    auth: {
      ...originalAuth,
      user: { id: 1, username: 'root', role: ROLE.SUPER_ADMIN },
    },
  })
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/task_plugin_options') {
      return { data: { success: true, data: pluginOptions } }
    }
    throw new Error(`Unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  useAuthStore.setState({ auth: originalAuth })
  vi.restoreAllMocks()
})

async function endpointOptions() {
  const user = userEvent.setup()
  await user.click(
    await screen.findByRole('combobox', { name: 'Endpoint Type' })
  )
  return within(await screen.findByRole('listbox'))
    .getAllByRole('option')
    .map((option) => option.textContent)
}

test('a plugin channel offers only the endpoints its plugin relays', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChannelsProvider>
        <OpenDialog channel={channel(61, '{"task_plugin_key":"relay-x"}')} />
      </ChannelsProvider>
    </QueryClientProvider>
  )

  await vi.waitFor(() =>
    expect(api.get).toHaveBeenCalledWith('/api/task_plugin_options')
  )
  expect(await endpointOptions()).toEqual([
    'Auto detect (default)',
    'OpenAI Responses (/v1/responses)',
    'Anthropic (/v1/messages)',
  ])
})

test('a built-in channel offers every endpoint', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChannelsProvider>
        <OpenDialog channel={channel(1)} />
      </ChannelsProvider>
    </QueryClientProvider>
  )

  const options = await endpointOptions()
  expect(options).toHaveLength(9)
  expect(options).toContain('OpenAI (/v1/chat/completions)')
  expect(api.get).not.toHaveBeenCalledWith('/api/task_plugin_options')
})
