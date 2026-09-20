import { describe, expect, it } from 'vitest'

import {
  normalizeProviderAction,
  tutorActionSchema,
  tutorResponseProviderSchema,
} from '@/lib/tutor/actions'

describe('expanded tutor actions', () => {
  it('accepts additional geo primitives', () => {
    const parsed = tutorActionSchema.safeParse({
      type: 'create_shape',
      shape: 'geo',
      id: 'triangle_1',
      x: 100,
      y: 100,
      w: 80,
      h: 80,
      geo: 'triangle',
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts styled closed strokes', () => {
    const parsed = tutorActionSchema.safeParse({
      type: 'create_stroke',
      id: 'body_1',
      x: 100,
      y: 100,
      points: [
        { x: 100, y: 100 },
        { x: 140, y: 120 },
        { x: 120, y: 160 },
      ],
      size: 'l',
      closed: true,
      fill: 'solid',
      color: 'green',
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts create_icon actions', () => {
    const parsed = tutorActionSchema.safeParse({
      type: 'create_icon',
      icon: 'woman',
      id: 'woman_1',
      x: 100,
      y: 100,
      w: 200,
      h: 200,
      color: 'violet',
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts group actions', () => {
    const parsed = tutorActionSchema.safeParse({
      type: 'group',
      id: 'woman_1',
      childIds: ['head_1', 'torso_1', 'arm_left_1'],
      label: 'woman',
    })
    expect(parsed.success).toBe(true)
  })

  it('normalizes nullable provider stroke fields', () => {
    const normalized = normalizeProviderAction({
      type: 'create_stroke',
      id: 'stroke_1',
      x: 0,
      y: 0,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      color: 'black',
      size: 'm',
      closed: true,
      fill: 'solid',
      label: null,
    })

    expect(normalized).toMatchObject({
      type: 'create_stroke',
      closed: true,
      fill: 'solid',
      size: 'm',
    })
  })

  it('accepts nullable provider group fields', () => {
    const parsed = tutorResponseProviderSchema.safeParse({
      actions: [
        {
          type: 'group',
          id: 'scene_1',
          childIds: ['tree_1', 'house_1'],
          label: null,
        },
      ],
      assistantMessage: 'Grouped the scene.',
    })
    expect(parsed.success).toBe(true)
  })
})
