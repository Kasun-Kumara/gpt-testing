import { describe, expect, it } from 'vitest'

import { hasDrawingIntent } from '@/lib/tutor/draw-intent'

describe('draw intent', () => {
  it('detects explicit drawing commands', () => {
    expect(hasDrawingIntent('draw a rectangle')).toBe(true)
    expect(hasDrawingIntent('connect the circle to the box')).toBe(true)
    expect(hasDrawingIntent('clear the board')).toBe(true)
  })

  it('ignores casual conversation', () => {
    expect(hasDrawingIntent('hello')).toBe(false)
    expect(hasDrawingIntent('what is photosynthesis')).toBe(false)
  })
})
