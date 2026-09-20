import { beforeEach, describe, expect, it } from 'vitest'
import { TestEditor } from 'tldraw/src/test/TestEditor'

import type { TutorAction } from '@/lib/tutor/actions'
import { executeTutorActions } from '@/lib/tutor/executor'
import { findShapeBySemanticId } from '@/lib/tutor/selectors'

describe('arrow connector integration', () => {
  let editor: TestEditor

  beforeEach(() => {
    editor = new TestEditor()
    editor.setCurrentTool('select')
  })

  it('connects two icon groups with an edge-anchored arrow', () => {
    const actions: TutorAction[] = [
      {
        type: 'create_icon',
        icon: 'woman',
        id: 'woman_1',
        x: 100,
        y: 100,
        w: 180,
        h: 180,
      },
      {
        type: 'create_icon',
        icon: 'vehicle',
        id: 'vehicle_1',
        x: 500,
        y: 120,
        w: 220,
        h: 160,
      },
      {
        type: 'create_arrow',
        id: 'arrow_1',
        fromId: 'woman_1',
        toId: 'vehicle_1',
      },
    ]

    const results = executeTutorActions(editor, actions)
    expect(results.every((result) => result.success)).toBe(true)

    const arrow = findShapeBySemanticId(editor, 'arrow_1')
    expect(arrow?.type).toBe('arrow')
    expect((arrow?.props as { bend?: number }).bend).toBe(0)
  })

  it('rejects arrows whose endpoints collapse to the same icon group', () => {
    const actions: TutorAction[] = [
      {
        type: 'create_icon',
        icon: 'woman',
        id: 'woman_1',
        x: 100,
        y: 100,
        w: 180,
        h: 180,
      },
      {
        type: 'create_arrow',
        id: 'arrow_1',
        fromId: 'woman_1__head',
        toId: 'woman_1__torso',
      },
    ]

    const results = executeTutorActions(editor, actions)
    expect(results.at(-1)?.success).toBe(false)
  })
})
