import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'

import { MultiSelect } from '@/components/multi-select'

test('hinted options show the hint in the dropdown and mark their chips without changing the chip name', async () => {
  const user = userEvent.setup()
  render(
    <MultiSelect
      options={[
        { value: 'alias', label: 'alias', hint: 'Redirects to upstream' },
        { value: 'plain', label: 'plain' },
      ]}
      selected={['alias', 'plain']}
      onChange={() => undefined}
      copyChipOnClick
    />
  )

  expect(screen.getByRole('button', { name: 'alias' })).toBeVisible()
  expect(screen.getByTitle('Redirects to upstream')).toHaveAttribute(
    'aria-hidden',
    'true'
  )
  expect(screen.getAllByTitle('Redirects to upstream')).toHaveLength(1)

  await user.click(screen.getByRole('combobox'))
  expect(screen.getByRole('option', { name: /^alias/ })).toHaveTextContent(
    'Redirects to upstream'
  )
  expect(screen.getByRole('option', { name: 'plain' })).not.toHaveTextContent(
    'Redirects to upstream'
  )
})
