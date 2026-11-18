import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { DateTimePicker } from '../datetime-picker'

test('shows the seconds of the selected time', () => {
  render(
    <DateTimePicker
      value={new Date(2026, 9, 11, 8, 30, 45)}
      onChange={() => undefined}
    />
  )
  expect(screen.getByLabelText('Time')).toHaveValue('08:30:45')
})

test('keeps the seconds typed into the time field', () => {
  const onChange = vi.fn()
  render(
    <DateTimePicker
      value={new Date(2026, 9, 11, 8, 0, 0)}
      onChange={onChange}
    />
  )
  fireEvent.change(screen.getByLabelText('Time'), {
    target: { value: '08:30:45' },
  })
  expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 9, 11, 8, 30, 45))
})

test('reads a time without seconds as zero seconds', () => {
  const onChange = vi.fn()
  render(
    <DateTimePicker
      value={new Date(2026, 9, 11, 8, 0, 30)}
      onChange={onChange}
    />
  )
  fireEvent.change(screen.getByLabelText('Time'), {
    target: { value: '09:15' },
  })
  expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 9, 11, 9, 15, 0))
})

test('keeps the current time when the time field is emptied', () => {
  const onChange = vi.fn()
  render(
    <DateTimePicker
      value={new Date(2026, 9, 11, 20, 30, 45)}
      onChange={onChange}
    />
  )
  const field = screen.getByLabelText('Time')
  fireEvent.change(field, { target: { value: '' } })
  expect(onChange).not.toHaveBeenCalled()
  expect(field).toHaveValue('20:30:45')
})
