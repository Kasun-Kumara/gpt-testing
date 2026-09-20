import { describe, expect, it } from 'vitest'

import {
  buildIconShortcutResponse,
  isSingleIconRequest,
  resolveIconFromMessage,
} from '@/lib/tutor/icon-intent'
import { expandIconToActions } from '@/lib/tutor/icons'

const baseContext = {
  viewport: { x: 0, y: 0, w: 1200, h: 700 },
  objects: [],
  selection: [],
  recentActions: [],
  conversation: [],
}

describe('icon intent', () => {
  it('resolves common aliases', () => {
    expect(resolveIconFromMessage('draw a woman')).toBe('woman')
    expect(resolveIconFromMessage('draw a vehicle')).toBe('vehicle')
    expect(resolveIconFromMessage('draw a bike')).toBe('bicycle')
    expect(resolveIconFromMessage('draw a car')).toBe('car')
  })

  it('does not build icons from casual speech', () => {
    expect(resolveIconFromMessage('can you figure this out')).toBe(null)
    expect(isSingleIconRequest('hey man how are you')).toBe(false)
    expect(isSingleIconRequest('what is a cat')).toBe(false)
    expect(buildIconShortcutResponse('hey man', baseContext)).toBe(null)
    expect(buildIconShortcutResponse('what is a cat', baseContext)).toBe(null)
  })

  it('detects single-icon requests only with draw intent', () => {
    expect(isSingleIconRequest('draw a woman')).toBe(true)
    expect(isSingleIconRequest('draw a woman and a car')).toBe(false)
    expect(isSingleIconRequest('draw a car')).toBe(true)
    expect(isSingleIconRequest('draw a person')).toBe(true)
  })

  it('builds a centered create_icon shortcut', () => {
    const response = buildIconShortcutResponse('draw a woman', baseContext)
    expect(response?.actions).toHaveLength(1)
    expect(response?.actions[0]).toMatchObject({
      type: 'create_icon',
      icon: 'woman',
      id: 'woman_1',
    })
  })

  it('draws the requested catalog subject, not a person fallback', () => {
    const car = buildIconShortcutResponse('draw a car', baseContext)
    expect(car?.actions[0]).toMatchObject({ type: 'create_icon', icon: 'car' })

    const tree = buildIconShortcutResponse('draw a tree', baseContext)
    expect(tree?.actions[0]).toMatchObject({ type: 'create_icon', icon: 'tree' })
  })

  it('expands icons without visible labels', () => {
    const actions = expandIconToActions({
      icon: 'woman',
      id: 'woman_1',
      x: 100,
      y: 100,
      w: 200,
      h: 200,
    })

    expect(actions.some((action) => action.type === 'group')).toBe(true)
    expect(
      actions.some(
        (action) =>
          (action.type === 'create_shape' && action.text) ||
          (action.type === 'create_text')
      )
    ).toBe(false)
  })
})
