import { describe, expect, test } from 'vitest'

import { parseStreamMessageUpdates } from '../../streaming/stream-utils'
import {
  applyChatCompletionResponse,
  applyStreamingChunk,
  completeAssistantMessage,
} from '../message-streaming-utils'
import { createLoadingAssistantMessage } from '../message-utils'

const reasoningCases = [
  {
    name: 'preserves reasoning_content',
    fields: { reasoning_content: 'Thought' },
    expected: 'Thought',
  },
  {
    name: 'accepts reasoning when reasoning_content is absent',
    fields: { reasoning: 'Thought' },
    expected: 'Thought',
  },
  {
    name: 'accepts reasoning when reasoning_content is null',
    fields: { reasoning_content: null, reasoning: 'Thought' },
    expected: 'Thought',
  },
  {
    name: 'prefers reasoning_content without appending reasoning',
    fields: { reasoning_content: 'Thought', reasoning: 'Other thought' },
    expected: 'Thought',
  },
  {
    name: 'preserves an explicitly empty reasoning_content',
    fields: { reasoning_content: '', reasoning: 'Other thought' },
    expected: undefined,
  },
  {
    name: 'keeps content-only responses free of reasoning',
    fields: {},
    expected: undefined,
  },
  {
    name: 'ignores null reasoning fields',
    fields: { reasoning_content: null, reasoning: null },
    expected: undefined,
  },
  {
    name: 'preserves think-tag extraction without reasoning fields',
    fields: { content: '<think>Thought</think>Answer' },
    expected: 'Thought',
  },
]

describe('chat completion reasoning', () => {
  test.each(reasoningCases)('streaming: $name', ({ fields, expected }) => {
    const updates = parseStreamMessageUpdates(
      JSON.stringify({
        choices: [{ delta: { content: 'Answer', ...fields } }],
      })
    )
    let message = createLoadingAssistantMessage(0)

    for (const update of updates) {
      message = applyStreamingChunk(message, update.type, update.chunk)
    }
    const completed = completeAssistantMessage(message)

    expect(completed.reasoning?.content).toBe(expected)
    expect(completed.versions[0].content).toBe('Answer')
    expect(completed.status).toBe('complete')
    expect(completed.isReasoningStreaming).toBe(false)
  })

  test.each(reasoningCases)('non-streaming: $name', ({ fields, expected }) => {
    const completed = applyChatCompletionResponse(
      createLoadingAssistantMessage(0),
      {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Answer', ...fields },
            finish_reason: 'stop',
          },
        ],
      }
    )

    expect(completed).not.toBeNull()
    expect(completed?.reasoning?.content).toBe(expected)
    expect(completed?.versions[0].content).toBe('Answer')
    expect(completed?.status).toBe('complete')
    expect(completed?.isReasoningStreaming).toBe(false)
  })

  test('emits reasoning before content when both occur in one delta', () => {
    const updates = parseStreamMessageUpdates(
      JSON.stringify({
        choices: [{ delta: { reasoning: 'Thought', content: 'Answer' } }],
      })
    )

    expect(updates).toEqual([
      { type: 'reasoning', chunk: 'Thought' },
      { type: 'content', chunk: 'Answer' },
    ])
  })
})
