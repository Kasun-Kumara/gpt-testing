import { describe, expect, it } from 'vitest'

import { resolveVisibleLabelText } from '@/lib/tutor/label-text'

describe('resolveVisibleLabelText', () => {
  it('prefers text over label metadata', () => {
    expect(resolveVisibleLabelText({ text: 'Input', label: 'rectangle' })).toBe('Input')
  })

  it('falls back to label when text is missing', () => {
    expect(resolveVisibleLabelText({ label: 'Input' })).toBe('Input')
  })
})
