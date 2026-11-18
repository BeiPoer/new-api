import { describe, expect, test } from 'vitest'

import {
  ADVANCED_CUSTOM_CONVERTER_OPTIONS,
  ADVANCED_CUSTOM_INCOMING_PATH_OPTIONS,
  getAdvancedCustomConverterDefaults,
  getAdvancedCustomConverterOptions,
  getAdvancedCustomIncomingPathLabel,
  getAdvancedCustomIncomingPathOptions,
  isAdvancedCustomIncomingPathAllowed,
} from '../advanced-custom'

describe('advanced custom incoming path options', () => {
  test('the web search and web fetch paths are selectable with native forwarding', () => {
    const values = ADVANCED_CUSTOM_INCOMING_PATH_OPTIONS.map(
      (option) => option.value
    )

    expect(values).toContain('/v1/tools/search')
    expect(values).toContain('/v1/tools/fetch')
    expect(
      isAdvancedCustomIncomingPathAllowed('/v1/tools/search', 'none')
    ).toBe(true)
    expect(isAdvancedCustomIncomingPathAllowed('/v1/tools/fetch', 'none')).toBe(
      true
    )
  })

  test('the web search and web fetch paths are labelled after DeepSeek', () => {
    expect(getAdvancedCustomIncomingPathLabel('/v1/tools/search')).toBe(
      'DeepSeek Search'
    )
    expect(getAdvancedCustomIncomingPathLabel('/v1/tools/fetch')).toBe(
      'DeepSeek Fetch'
    )
  })

  test('the web search and web fetch paths reject every converting converter', () => {
    const convertingConverters = ADVANCED_CUSTOM_CONVERTER_OPTIONS.map(
      (option) => option.value
    ).filter((value) => value !== 'none')

    expect(convertingConverters.length).toBeGreaterThan(0)
    for (const converter of convertingConverters) {
      expect(
        isAdvancedCustomIncomingPathAllowed('/v1/tools/search', converter)
      ).toBe(false)
      expect(
        isAdvancedCustomIncomingPathAllowed('/v1/tools/fetch', converter)
      ).toBe(false)
    }
  })

  test('the web search path only offers native forwarding as its converter', () => {
    expect(
      getAdvancedCustomConverterOptions('/v1/tools/search').map(
        (option) => option.value
      )
    ).toEqual(['none'])
    expect(
      getAdvancedCustomConverterOptions('/v1/tools/fetch').map(
        (option) => option.value
      )
    ).toEqual(['none'])
  })

  test('native forwarding keeps the web search path as its own upstream path', () => {
    expect(
      getAdvancedCustomConverterDefaults('none', '/v1/tools/search')
    ).toEqual({
      upstream_path: '/v1/tools/search',
      auth: {
        type: 'header',
        name: 'Authorization',
        value: 'Bearer {api_key}',
      },
    })
  })

  test('the web search and web fetch paths are offered for native forwarding only', () => {
    const nativePaths = getAdvancedCustomIncomingPathOptions('none').map(
      (option) => option.value
    )
    const convertedPaths = getAdvancedCustomIncomingPathOptions(
      'openai_chat_completions_to_openai_responses'
    ).map((option) => option.value)

    expect(nativePaths).toContain('/v1/tools/search')
    expect(nativePaths).toContain('/v1/tools/fetch')
    expect(convertedPaths).not.toContain('/v1/tools/search')
    expect(convertedPaths).not.toContain('/v1/tools/fetch')
  })
})
