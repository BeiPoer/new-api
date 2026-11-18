import { createInstance } from 'i18next'
import { describe, expect, test } from 'vitest'

import { logTokenName } from '../format'

describe('usage log token name', () => {
  test('translates the name the gateway wrote when the log has no token', async () => {
    const i18n = createInstance()
    await i18n.init({
      lng: 'zh',
      resources: { zh: { translation: { 'Model test': '模型测试' } } },
    })

    expect(
      logTokenName({ token_id: 0, token_name: 'Model test' }, i18n.t)
    ).toBe('模型测试')
  })

  test('keeps the name of a real token as written when it equals a translation key', async () => {
    const i18n = createInstance()
    await i18n.init({
      lng: 'zh',
      resources: { zh: { translation: { 'Model test': '模型测试' } } },
    })

    expect(
      logTokenName({ token_id: 7, token_name: 'Model test' }, i18n.t)
    ).toBe('Model test')
  })
})
