import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import type { TaskPluginOption } from '../../api'
import { channelSchema, type Channel } from '../../types'
import { ChannelsProvider } from '../channels-provider'
import { DataTableRowActions } from '../data-table-row-actions'

const originalAuth = useAuthStore.getState().auth
const pluginOptions: TaskPluginOption[] = [
  { key: 'with-balance', name: 'With balance', models: [], balance: true },
  { key: 'no-balance', name: 'No balance', models: [], balance: false },
]

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

test.each([
  { name: 'a built-in channel', type: 1, plugin: '', shown: true },
  {
    name: 'a plugin that reports one',
    type: 61,
    plugin: 'with-balance',
    shown: true,
  },
  {
    name: 'a plugin that does not',
    type: 61,
    plugin: 'no-balance',
    shown: false,
  },
  {
    // Without the bind permission the plugin is unknown; the server answers.
    name: 'a plugin, to an admin who cannot read plugins',
    type: 61,
    plugin: 'no-balance',
    admin: true,
    shown: true,
  },
])(
  '"Query Balance" follows whether $name can report a balance',
  async (item: {
    type: number
    plugin: string
    shown: boolean
    admin?: boolean
  }) => {
    if (item.admin) {
      useAuthStore.setState({
        auth: {
          ...originalAuth,
          user: { id: 2, username: 'admin', role: ROLE.ADMIN },
        },
      })
    }
    const channel: Channel = channelSchema.parse({
      id: 3,
      name: 'Channel',
      type: item.type,
      key: '',
      status: 1,
      created_time: 1,
      test_time: 0,
      response_time: 0,
      balance_updated_time: 0,
      setting: item.plugin
        ? JSON.stringify({ task_plugin_key: item.plugin })
        : '',
    })
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ChannelsProvider>
          <TooltipProvider>
            <DataTableRowActions row={{ original: channel } as Row<Channel>} />
          </TooltipProvider>
        </ChannelsProvider>
      </QueryClientProvider>
    )
    if (item.plugin && !item.admin) {
      await vi.waitFor(() =>
        expect(api.get).toHaveBeenCalledWith('/api/task_plugin_options')
      )
    }

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(
      await screen.findByRole('menuitem', { name: 'Test Connection' })
    ).toBeVisible()
    if (item.shown) {
      expect(
        await screen.findByRole('menuitem', { name: 'Query Balance' })
      ).toBeVisible()
    } else {
      expect(
        screen.queryByRole('menuitem', { name: 'Query Balance' })
      ).not.toBeInTheDocument()
    }
    if (item.admin) {
      expect(api.get).not.toHaveBeenCalledWith('/api/task_plugin_options')
    }
  }
)
