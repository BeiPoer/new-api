import i18next from 'i18next'
import { describe, expect, test } from 'vitest'

import {
  getServerErrorMessage,
  getServerErrorMessageKey,
  translateServerText,
} from './server-error-message'

describe('server error message mapping', () => {
  test('maps the active-session limit to recovery instructions', () => {
    const message = getServerErrorMessageKey({ code: 'AUTH_SESSION_LIMIT' })

    expect(message ?? '').toMatch(/Sign out other sessions/)
    expect(message ?? '').toMatch(/reset your password/)
  })

  test('maps an Axios-shaped issuance limit to rolling-window guidance', () => {
    const message = getServerErrorMessageKey({
      response: { data: { code: 'AUTH_SESSION_ISSUANCE_LIMIT' } },
    })

    expect(message ?? '').toMatch(/rolling window/)
    expect(getServerErrorMessageKey({ code: 'UNKNOWN_CODE' })).toBe(null)
  })

  test('maps stable Telegram bind errors without exposing server text', () => {
    const expected = {
      TELEGRAM_BIND_DISABLED: 'Telegram binding is disabled.',
      TELEGRAM_BIND_INVALID_REQUEST:
        'The Telegram authorization request is invalid or expired.',
      TELEGRAM_BIND_FLOW_INVALID:
        'This Telegram binding request has expired or has already been used.',
      TELEGRAM_BIND_SESSION_INVALID:
        'The login session that started this Telegram binding is no longer valid.',
      TELEGRAM_BIND_ALREADY_BOUND: 'This Telegram account is already bound.',
      TELEGRAM_BIND_USER_DELETED: 'This user account no longer exists.',
      TELEGRAM_BIND_USER_DISABLED: 'This user account is disabled.',
      TELEGRAM_BIND_INTERNAL_ERROR:
        'Telegram binding failed. Please try again.',
    }

    for (const [code, message] of Object.entries(expected)) {
      expect(getServerErrorMessageKey({ code })).toBe(message)
    }

    expect(
      getServerErrorMessageKey({
        response: {
          data: { code: 'TELEGRAM_BIND_INTERNAL_ERROR', message: 'raw detail' },
        },
      })
    ).toBe(expected.TELEGRAM_BIND_INTERNAL_ERROR)
  })

  test('translates message_key with message_params in the active language', async () => {
    i18next.addResourceBundle('zhCN', 'translation', {
      'Quota value exceeds valid range, maximum is {{max}}':
        '额度超出有效范围，最大为 {{max}}',
    })
    await i18next.changeLanguage('zhCN')
    try {
      const data = {
        success: false,
        message: 'Quota value exceeds valid range, maximum is 100',
        message_key: 'Quota value exceeds valid range, maximum is {{max}}',
        message_params: { max: 100 },
      }

      expect(getServerErrorMessage(data)).toBe('额度超出有效范围，最大为 100')
      expect(
        getServerErrorMessage({ isAxiosError: true, response: { data } })
      ).toBe('额度超出有效范围，最大为 100')
    } finally {
      await i18next.changeLanguage('en')
    }
  })

  test('renders an untranslated message_key as English text', () => {
    expect(
      getServerErrorMessage({
        success: false,
        message: 'Channel 7 does not exist',
        message_key: 'Channel {{id}} does not exist',
        message_params: { id: 7 },
      })
    ).toBe('Channel 7 does not exist')
  })

  test('translates a backend source key and leaves upstream text as written', async () => {
    i18next.addResourceBundle('zhCN', 'translation', {
      'Task timed out': '任务超时',
    })
    await i18next.changeLanguage('zhCN')
    try {
      expect(translateServerText(i18next.t, 'Task timed out')).toBe('任务超时')
      const upstream = 'upstream said {{bad}} and $t(Task timed out)'
      expect(translateServerText(i18next.t, upstream)).toBe(upstream)
    } finally {
      await i18next.changeLanguage('en')
    }
  })
})
