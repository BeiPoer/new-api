import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { expect, it } from 'vitest'

import { Form } from '@/components/ui/form'

import type { SetupFormValues } from '../../types'
import { AdminStep } from '../admin-step'

function AdminStepFixture() {
  const form = useForm<SetupFormValues>({
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      usageMode: 'external',
    },
  })

  return (
    <Form {...form}>
      <AdminStep form={form} />
    </Form>
  )
}

it('a mismatched administrator password confirmation is announced on the confirmation field', async () => {
  const user = userEvent.setup()
  render(<AdminStepFixture />)

  await user.type(screen.getByLabelText('Password'), 'Forest7!Lake')
  await user.type(screen.getByLabelText('Confirm password'), 'Forest7!Lakes')

  expect(screen.getByLabelText('Confirm password')).toHaveAccessibleDescription(
    expect.stringContaining('Passwords do not match')
  )
})
