import { describe, expect, it } from 'vitest'

import type { TutorAction } from '@/lib/tutor/actions'
import {
  applyConnectIntent,
  parseConnectIntent,
  resolveConnectableObjectId,
} from '@/lib/tutor/connect-intent'
import { getConnectorBindingAnchors, normalizedAnchorToward } from '@/lib/tutor/arrow-utils'
import type { TutorCanvasContext } from '@/types/tutor'

const context: TutorCanvasContext = {
  viewport: { x: 0, y: 0, w: 1200, h: 800 },
  objects: [
    { id: 'woman_1', tldrawId: 'shape:woman1', type: 'group', x: 200, y: 100, w: 180, h: 180, label: 'woman' },
    { id: 'vehicle_1', tldrawId: 'shape:vehicle1', type: 'group', x: 700, y: 120, w: 220, h: 160, label: 'vehicle' },
  ],
  selection: [],
  recentActions: [],
  conversation: [],
  suggestedIds: {
    rectangle: 'rectangle_1',
    ellipse: 'ellipse_1',
    stroke: 'stroke_1',
    line: 'line_1',
    arrow: 'arrow_1',
    text: 'text_1',
    group: 'group_1',
    icon: 'icon_1',
  },
}

describe('connect intent', () => {
  it('parses connect requests', () => {
    expect(parseConnectIntent('Connect the woman with the vehicle with an arrow')).toEqual({
      fromTerm: 'woman',
      toTerm: 'vehicle',
    })
  })

  it('resolves top-level object ids from natural language', () => {
    expect(resolveConnectableObjectId(context, 'the woman')).toBe('woman_1')
    expect(resolveConnectableObjectId(context, 'vehicle')).toBe('vehicle_1')
  })

  it('rewrites broken self-loop arrows between icon parts', () => {
    const actions: TutorAction[] = [
      {
        type: 'create_arrow',
        id: 'arrow_1',
        fromId: 'woman_1__head',
        toId: 'woman_1__torso',
        bend: 80,
      },
    ]

    const upgraded = applyConnectIntent(
      'Connect the woman with the vehicle with an arrow',
      context,
      actions
    )

    expect(upgraded[0]).toMatchObject({
      type: 'create_arrow',
      fromId: 'woman_1',
      toId: 'vehicle_1',
    })
    expect((upgraded[0] as Extract<TutorAction, { type: 'create_arrow' }>).bend).toBeUndefined()
  })
})

describe('arrow edge anchors', () => {
  it('points anchors toward the other shape', () => {
    const start = { x: 0, y: 0, w: 100, h: 100 }
    const end = { x: 300, y: 0, w: 100, h: 100 }

    const anchors = getConnectorBindingAnchors(start, end)
    expect(anchors.start.x).toBeGreaterThan(0.5)
    expect(anchors.end.x).toBeLessThan(0.5)
    expect(normalizedAnchorToward(start, { x: 350, y: 50 }).x).toBe(1)
  })
})
