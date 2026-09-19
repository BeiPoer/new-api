/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
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
