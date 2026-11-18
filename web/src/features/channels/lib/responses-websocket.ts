import { CHANNEL_TYPE_NEW_API, CHANNEL_TYPE_SUB2API } from '../constants'
import { CHANNEL_TYPE_ADVANCED_CUSTOM } from './advanced-custom'

/**
 * Channel types whose upstream can carry the Responses WebSocket protocol.
 * Mirrors the backend FilterResponsesWebSocket allow list; the per-channel
 * toggle still decides whether a channel is actually used.
 */
const RESPONSES_WEBSOCKET_CHANNEL_TYPES: ReadonlySet<number> = new Set([
  1,
  3,
  57,
  CHANNEL_TYPE_ADVANCED_CUSTOM,
  CHANNEL_TYPE_SUB2API,
  CHANNEL_TYPE_NEW_API,
])

export function supportsResponsesWebSocket(channelType: number): boolean {
  return RESPONSES_WEBSOCKET_CHANNEL_TYPES.has(channelType)
}
