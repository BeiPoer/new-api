import { describe, expect, test } from 'vitest'

import { createRegisterFormSchema } from '../constants'

describe('registration phone settings with upstream password rules', () => {
  const data = {
    username: 'user',
    email: '',
    phone: '',
    password: 'a'.repeat(128),
    confirmPassword: 'a'.repeat(128),
  }
  test('accepts 128-character passwords when phone collection is disabled', () => {
    expect(createRegisterFormSchema(false, false).safeParse(data).success).toBe(
      true
    )
  })
  test('requires a valid phone only when configured', () => {
    const schema = createRegisterFormSchema(true, true)
    expect(schema.safeParse(data).success).toBe(false)
    expect(schema.safeParse({ ...data, phone: 'invalid' }).success).toBe(false)
    expect(schema.safeParse({ ...data, phone: ' 13800138000 ' }).success).toBe(
      true
    )
    expect(createRegisterFormSchema(true, false).safeParse(data).success).toBe(
      true
    )
  })
  test('rejects passwords beyond the upstream maximum', () => {
    expect(
      createRegisterFormSchema(false, false).safeParse({
        ...data,
        password: 'a'.repeat(129),
        confirmPassword: 'a'.repeat(129),
      }).success
    ).toBe(false)
  })
})
