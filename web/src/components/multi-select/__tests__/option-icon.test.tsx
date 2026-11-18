import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'

import { MultiSelect } from '@/components/multi-select'

test('option icons render beside the label on chips and in the dropdown without changing accessible names', async () => {
  const user = userEvent.setup()
  render(
    <MultiSelect
      options={[
        {
          value: 'doubao',
          label: 'Doubao',
          icon: <span data-testid='icon-doubao' />,
        },
        { value: 'plain', label: 'plain' },
      ]}
      selected={['doubao']}
      onChange={() => undefined}
    />
  )

  const chipIcon = screen.getByTestId('icon-doubao')
  expect(chipIcon).toBeVisible()
  expect(chipIcon.parentElement).toHaveAttribute('aria-hidden', 'true')
  expect(screen.getByText('Doubao')).toBeVisible()

  await user.click(screen.getByRole('combobox'))
  const option = screen.getByRole('option', { name: 'Doubao' })
  expect(within(option).getByTestId('icon-doubao')).toBeInTheDocument()
  expect(
    within(screen.getByRole('option', { name: 'plain' })).queryByTestId(/icon-/)
  ).not.toBeInTheDocument()
})
