import { describe, expect, test } from 'vitest'

import {
  isResponseModelMismatch,
  type ResponseModelObservation,
} from '../response-model'

function observation(
  returned: string,
  overrides: Partial<ResponseModelObservation> = {}
): ResponseModelObservation {
  return {
    requested_model: 'requested',
    upstream_model: 'mapped',
    returned_model: returned,
    ...overrides,
  }
}

describe('isResponseModelMismatch', () => {
  test.each([
    ['requested', 'exact requested model'],
    ['mapped', 'exact upstream model'],
    ['Requested', 'case-only difference'],
    ['requested-2026-09-01', 'dated variant of the requested model'],
    ['mapped-2026-09-01', 'dated variant of the upstream model'],
    ['deepseek/requested', 'provider path in front of the requested model'],
    ['vendor/MAPPED', 'provider path with a case-only difference'],
    ['accounts/vendor/models/requested', 'nested provider path'],
  ])('treats %s as compatible (%s)', (returned) => {
    expect(isResponseModelMismatch(observation(returned))).toBe(false)
  })

  test.each([
    ['other', 'different model'],
    ['request', 'shorter name that the expected model extends'],
    ['vendor/other', 'different model behind a provider path'],
    ['vendor/request', 'provider path with a shorter name'],
    ['vendor/', 'provider path with no model segment'],
    ['vendor', 'provider segment alone'],
  ])('flags %s as a mismatch (%s)', (returned) => {
    expect(isResponseModelMismatch(observation(returned))).toBe(true)
  })

  test('compares against provider-qualified requested and upstream names as written', () => {
    expect(
      isResponseModelMismatch(
        observation('vendor/requested-2026-09-01', {
          requested_model: 'vendor/requested',
        })
      )
    ).toBe(false)
    expect(
      isResponseModelMismatch(
        observation('vendor/other', { requested_model: 'vendor/requested' })
      )
    ).toBe(true)
  })

  test('empty expected names never match', () => {
    expect(
      isResponseModelMismatch(
        observation('other', { requested_model: '', upstream_model: '' })
      )
    ).toBe(true)
  })

  test('returns false without an observation or a returned model', () => {
    expect(isResponseModelMismatch(undefined)).toBe(false)
    expect(isResponseModelMismatch(observation(''))).toBe(false)
  })
})
