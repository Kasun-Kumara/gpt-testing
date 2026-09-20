import { describe, expect, it } from 'vitest'

import {
  filterEnglishTranscript,
  hasEnglishContent,
  normalizeEnglishCommand,
} from '@/lib/speech/english-only'

describe('english-only speech filtering', () => {
  it('keeps English commands', () => {
    expect(normalizeEnglishCommand('draw a green circle')).toBe('draw a green circle')
    expect(hasEnglishContent('draw a green circle')).toBe(true)
  })

  it('drops non-English fragments', () => {
    expect(filterEnglishTranscript('namaste draw a circle')).toContain('draw a circle')
    expect(hasEnglishContent('namaste')).toBe(false)
  })
})
