import { describe, expect, it } from 'vitest'

import { tutorActionSchema } from '@/lib/tutor/actions'
import {
  assessDrawingQuality,
  countDrawableParts,
  hasDrawingIntent,
  isComplexSubjectRequest,
  isSimplePrimitiveRequest,
  sanitizeIllustrationActions,
} from '@/lib/tutor/quality'

describe('drawing quality heuristics', () => {
  it('detects simple primitive requests', () => {
    expect(isSimplePrimitiveRequest('draw a circle')).toBe(true)
    expect(isSimplePrimitiveRequest('draw a woman')).toBe(false)
  })

  it('detects complex subject requests', () => {
    expect(isComplexSubjectRequest('draw a woman standing in a garden')).toBe(true)
    expect(isComplexSubjectRequest('draw a rectangle')).toBe(false)
  })

  it('accepts empty actions for talk-only messages', () => {
    expect(hasDrawingIntent('hello')).toBe(false)
    expect(assessDrawingQuality('hello', []).ok).toBe(true)
    expect(assessDrawingQuality('what is a cat', []).ok).toBe(true)
    expect(assessDrawingQuality('can you figure this out', []).ok).toBe(true)
  })

  it('rejects a single-circle plan for draw a woman', () => {
    const actions = [
      {
        type: 'create_shape' as const,
        shape: 'geo' as const,
        id: 'circle_1',
        x: 100,
        y: 100,
        w: 80,
        h: 80,
        geo: 'ellipse' as const,
      },
    ]

    const result = assessDrawingQuality('draw a woman', actions)
    expect(result.ok).toBe(false)
    expect(result.feedback).toMatch(/create_icon/i)
  })

  it('accepts a create_icon plan for draw a woman', () => {
    const actions = tutorActionSchema.parse({
      type: 'create_icon',
      icon: 'woman',
      id: 'woman_1',
      x: 400,
      y: 200,
      w: 220,
      h: 220,
    })

    expect(countDrawableParts([actions])).toBe(1)
    expect(assessDrawingQuality('draw a woman', [actions]).ok).toBe(true)
  })

  it('rejects a person icon when the user asked for a car', () => {
    const wrongIcon = tutorActionSchema.parse({
      type: 'create_icon',
      icon: 'person',
      id: 'person_1',
      x: 400,
      y: 200,
      w: 220,
      h: 220,
    })

    const result = assessDrawingQuality('draw a car', [wrongIcon])
    expect(result.ok).toBe(false)
    expect(result.feedback).toMatch(/car/i)
  })

  it('accepts a create_icon plan for draw a person', () => {
    const actions = tutorActionSchema.parse({
      type: 'create_icon',
      icon: 'person',
      id: 'person_1',
      x: 400,
      y: 200,
      w: 220,
      h: 220,
    })

    expect(assessDrawingQuality('draw a person', [actions]).ok).toBe(true)
  })

  it('rejects unsolicited part labels in illustrations', () => {
    const actions = [
      tutorActionSchema.parse({
        type: 'create_shape',
        shape: 'geo',
        id: 'head_1',
        x: 200,
        y: 100,
        w: 60,
        h: 60,
        geo: 'ellipse',
        text: 'Head',
      }),
    ]

    expect(assessDrawingQuality('draw a woman', actions).ok).toBe(false)
  })

  it('strips unsolicited shape text for illustrations', () => {
    const actions = [
      tutorActionSchema.parse({
        type: 'create_shape',
        shape: 'geo',
        id: 'head_1',
        x: 200,
        y: 100,
        w: 60,
        h: 60,
        geo: 'ellipse',
        text: 'Head',
      }),
    ]

    const sanitized = sanitizeIllustrationActions('draw a woman', actions)
    expect(sanitized[0]).not.toHaveProperty('text')
  })

  it('accepts a genuine simple circle request', () => {
    const actions = [
      {
        type: 'create_shape' as const,
        shape: 'geo' as const,
        id: 'circle_1',
        x: 100,
        y: 100,
        w: 80,
        h: 80,
        geo: 'ellipse' as const,
      },
    ]

    expect(assessDrawingQuality('draw a circle', actions).ok).toBe(true)
  })
})
