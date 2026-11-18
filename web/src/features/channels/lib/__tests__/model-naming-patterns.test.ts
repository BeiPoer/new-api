import { describe, expect, test } from 'vitest'

import {
  detectModelNamingPatterns,
  findVerifiedAlias,
} from '../model-naming-patterns'

describe('detectModelNamingPatterns', () => {
  test('a relay suffix is suggested for every model carrying it, while known names are never candidates', () => {
    const suggestions = detectModelNamingPatterns(
      ['gpt-4o-all', 'brand-new-all', 'gpt-4o-mini', 'o3'],
      ['gpt-4o', 'gpt-4o-mini', 'o3']
    )
    expect(suggestions).toEqual([
      {
        id: 'strip-suffix:-all',
        rule: { type: 'strip-suffix', values: '-all' },
        models: ['gpt-4o-all', 'brand-new-all'],
      },
    ])
  })

  test('vendor prefixes need two models or one verified name, and dotted versions need a known dashed name', () => {
    expect(
      detectModelNamingPatterns(
        ['openai/gpt-4o', 'openai/o3', 'solo/thing', 'claude-3.5-sonnet'],
        ['claude-3-5-sonnet']
      )
    ).toEqual([
      {
        id: 'strip-prefix:openai/',
        rule: { type: 'strip-prefix', values: 'openai/' },
        models: ['openai/gpt-4o', 'openai/o3'],
      },
      {
        id: 'replace:.:-',
        rule: { type: 'replace', find: '.', replaceWith: '-' },
        models: ['claude-3.5-sonnet'],
      },
    ])
  })

  test('date suffixes are grouped per date and arbitrary suffixes such as -mini are not suggested', () => {
    const suggestions = detectModelNamingPatterns(
      ['gpt-4o-2024-08-06', 'gpt-4o-2024-11-20', 'o3-mini'],
      ['gpt-4o', 'o3']
    )
    expect(suggestions.map((item) => item.id)).toEqual([
      'strip-suffix:-2024-08-06',
      'strip-suffix:-2024-11-20',
    ])
  })
})

describe('findVerifiedAlias', () => {
  const suggestions = detectModelNamingPatterns(
    ['gpt-4o-all', 'brand-new-all'],
    ['gpt-4o']
  )

  test('returns the pair when the derived request name is a known model', () => {
    expect(findVerifiedAlias('gpt-4o-all', suggestions, ['gpt-4o'])).toEqual({
      from: 'gpt-4o',
      to: 'gpt-4o-all',
    })
  })

  test('returns null for unknown derived names and for models outside every suggestion', () => {
    expect(findVerifiedAlias('brand-new-all', suggestions, ['gpt-4o'])).toBe(
      null
    )
    expect(findVerifiedAlias('o3', suggestions, ['gpt-4o', 'o3'])).toBe(null)
  })
})
