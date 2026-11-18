import { render } from '@testing-library/react'
import { expect, test } from 'vitest'

import { Markdown } from '../markdown'

test.each([
  ['inline', 'Formula: $$\\frac{1}{2}$$.'],
  ['display', '$$\n\\frac{1}{2}\n$$'],
  ['fenced', '```math\n\\frac{1}{2}\n```'],
])('preserves MathML and visual output when rendering %s math', (_, source) => {
  const view = render(<Markdown>{source}</Markdown>)
  const math = view.getByRole('math', { hidden: true })

  expect(math.querySelector('mfrac')).not.toBeNull()
  expect(math.querySelector('annotation')).toHaveTextContent('\\frac{1}{2}')
  expect(view.container.querySelector('.katex-html')).toHaveAttribute(
    'aria-hidden',
    'true'
  )
})

test('does not load math resources when trust is inherited from a polluted prototype', () => {
  const originalTrust = Object.getOwnPropertyDescriptor(
    Object.prototype,
    'trust'
  )

  try {
    Object.defineProperty(Object.prototype, 'trust', {
      configurable: true,
      value: true,
      writable: true,
    })

    const view = render(
      <Markdown>
        {'$$\\includegraphics{https://example.com/untrusted.png}$$'}
      </Markdown>
    )

    expect(view.container.querySelector('img')).toBeNull()
    expect(view.container).toHaveTextContent('\\includegraphics')
  } finally {
    if (originalTrust) {
      Object.defineProperty(Object.prototype, 'trust', originalTrust)
    } else {
      Reflect.deleteProperty(Object.prototype, 'trust')
    }
  }
})
