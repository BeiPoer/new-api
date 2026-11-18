import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { assert, expect, test } from 'vitest'

import { GroupRatioVisualEditor } from '../group-ratio-visual-editor'

function PricingFixture() {
  const [settings, setSettings] = useState<Record<string, string>>({
    GroupRatio: '{"default":1}',
    TopupGroupRatio: '{}',
    UserUsableGroups: '{}',
  })
  return (
    <>
      <GroupRatioVisualEditor
        section='pricing'
        onSectionChange={() => {}}
        defaultUseAutoGroupField={null}
        groupRatio={settings.GroupRatio}
        topupGroupRatio={settings.TopupGroupRatio}
        userUsableGroups={settings.UserUsableGroups}
        groupGroupRatio='{}'
        autoGroups='[]'
        maxTokenAutoGroupsField={null}
        groupSpecialUsableGroup='{}'
        onChange={(field, value) =>
          setSettings((current) => ({ ...current, [field]: value }))
        }
      />
      <output aria-label='Saved ratios'>{JSON.stringify(settings)}</output>
    </>
  )
}

test.each([
  ['GroupRatio', 0],
  ['TopupGroupRatio', 1],
] as const)(
  '%s preserves typed decimals and accepts them as valid numeric ratios',
  async (key, index) => {
    const user = userEvent.setup()
    render(<PricingFixture />)
    const row = screen.getByDisplayValue('default').closest('tr')
    assert(row)
    const input = within(row).getAllByRole('spinbutton')[
      index
    ] as HTMLInputElement
    fireEvent.change(input, { target: { value: '0.0' } })
    expect(input.value).toBe('0.0')
    await user.clear(input)
    await user.type(input, '0.04')
    expect(input).toHaveValue(0.04)
    await user.tab()
    expect(input.checkValidity()).toBe(true)
    const saved = JSON.parse(
      screen.getByRole('status', { name: 'Saved ratios' }).textContent ?? '{}'
    )
    expect(JSON.parse(saved[key])).toEqual({ default: 0.04 })
    await user.clear(input)
    await user.type(input, '0.0001')
    expect(input).toHaveValue(0.0001)
    expect(input.checkValidity()).toBe(true)
    await user.clear(input)
    await user.type(input, '0.00001')
    expect(input.validity.stepMismatch).toBe(true)
    await user.clear(input)
    await user.type(input, '-0.04')
    expect(input.validity.rangeUnderflow).toBe(true)
  }
)
