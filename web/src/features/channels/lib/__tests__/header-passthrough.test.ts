import { describe, expect, test } from 'vitest'

import {
  getHeaderPassthroughState,
  setHeaderPassthrough,
} from '../header-passthrough'

describe('getHeaderPassthroughState', () => {
  test.each([
    ['undefined', undefined, 'disabled'],
    ['empty string', '', 'disabled'],
    ['whitespace only', '  \n', 'disabled'],
    ['empty object', '{}', 'disabled'],
    ['object without wildcard', '{"X-Foo":"bar"}', 'disabled'],
    ['regex rule only', '{"re:^X-Trace-.*$": true}', 'disabled'],
    ['wildcard with boolean value', '{"*": true}', 'enabled'],
    ['wildcard with empty string value', '{"*": ""}', 'enabled'],
    ['padded wildcard key', '{" * ": true}', 'enabled'],
    ['wildcard among other rules', '{"X-Foo":"bar","*":true}', 'enabled'],
    ['invalid JSON', '{"*": tru', 'invalid'],
    ['JSON array', '["*"]', 'invalid'],
    ['JSON string', '"*"', 'invalid'],
  ] as const)('reports %s as %s', (_label, headerOverride, expected) => {
    expect(getHeaderPassthroughState(headerOverride)).toBe(expected)
  })
})

describe('setHeaderPassthrough', () => {
  test('enabling on an empty field writes the wildcard rule alone', () => {
    expect(JSON.parse(setHeaderPassthrough('', true))).toEqual({ '*': true })
    expect(JSON.parse(setHeaderPassthrough(undefined, true))).toEqual({
      '*': true,
    })
  })

  test('enabling keeps existing overrides and lists the wildcard first', () => {
    const next = setHeaderPassthrough(
      '{"Authorization":"Bearer {api_key}","X-Foo":"{client_header:X-Foo}"}',
      true
    )
    expect(JSON.parse(next)).toEqual({
      '*': true,
      Authorization: 'Bearer {api_key}',
      'X-Foo': '{client_header:X-Foo}',
    })
    expect(Object.keys(JSON.parse(next))[0]).toBe('*')
  })

  test('enabling when already enabled normalizes a padded key to "*"', () => {
    expect(JSON.parse(setHeaderPassthrough('{" * ": ""}', true))).toEqual({
      '*': true,
    })
  })

  test('disabling removes only the wildcard rule and keeps other entries', () => {
    const next = setHeaderPassthrough(
      '{"*": true, "re:^X-Trace-.*$": true, "X-Foo": "bar"}',
      false
    )
    expect(JSON.parse(next)).toEqual({
      're:^X-Trace-.*$': true,
      'X-Foo': 'bar',
    })
  })

  test('disabling the last rule clears the field to an empty string', () => {
    expect(setHeaderPassthrough('{"*": true}', false)).toBe('')
    expect(setHeaderPassthrough('', false)).toBe('')
  })

  test('invalid JSON is returned unchanged in both directions', () => {
    expect(setHeaderPassthrough('{"*": tru', true)).toBe('{"*": tru')
    expect(setHeaderPassthrough('{"*": tru', false)).toBe('{"*": tru')
  })

  test('output is pretty-printed with two-space indentation', () => {
    expect(setHeaderPassthrough('', true)).toBe('{\n  "*": true\n}')
  })
})
