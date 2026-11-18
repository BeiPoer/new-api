import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import { FieldLabel } from '../field'
import { Form, FormControl, FormField, FormItem, FormLabel } from '../form'
import { Input } from '../input'
import { Label } from '../label'

function FormLabelFixture() {
  const form = useForm({ defaultValues: { name: '' } })
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name='name'
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  )
}

describe('required field labels', () => {
  it.each([Label, FieldLabel])(
    'updates the required marker while preserving the associated control',
    async (LabelComponent) => {
      const view = render(
        <>
          <LabelComponent htmlFor='model' required>
            Model
          </LabelComponent>
          <Input id='model' />
        </>
      )
      const user = userEvent.setup()
      const input = screen.getByRole('textbox', { name: 'Model *' })
      await user.click(screen.getByText('*'))
      expect(input).toHaveFocus()

      view.rerender(
        <>
          <LabelComponent htmlFor='model' required={false}>
            Model
          </LabelComponent>
          <Input id='model' />
        </>
      )
      expect(screen.queryByText('*')).not.toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Model' })).toBe(input)
    }
  )

  it('keeps the required form label associated with its React Hook Form control', async () => {
    render(<FormLabelFixture />)
    const user = userEvent.setup()
    const input = screen.getByRole('textbox', { name: 'Name *' })
    await user.click(screen.getByText('*'))
    expect(input).toHaveFocus()
    await user.type(input, 'Example')
    expect(input).toHaveValue('Example')
  })
})
