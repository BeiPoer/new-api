import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'

import { PasswordInput } from '../password-input'

test('the visibility toggle names the action it will take and unmasks the value', async () => {
  const user = userEvent.setup()
  render(<PasswordInput aria-label='Password' defaultValue='secret-value' />)
  const input = screen.getByLabelText('Password')
  expect(input).toHaveAttribute('type', 'password')

  await user.click(screen.getByRole('button', { name: 'Show password' }))

  expect(input).toHaveAttribute('type', 'text')
  expect(
    screen.getByRole('button', { name: 'Hide password' })
  ).toBeInTheDocument()
})
