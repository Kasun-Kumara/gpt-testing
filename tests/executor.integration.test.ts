import { beforeEach, describe, expect, it } from 'vitest'
import { b64Vecs } from 'tldraw'
import { TestEditor } from 'tldraw/src/test/TestEditor'

import type { TutorAction } from '@/lib/tutor/actions'
import { executeTutorActions, getShapeMetaForTests } from '@/lib/tutor/executor'
import { findShapeBySemanticId } from '@/lib/tutor/selectors'

describe('executor integration', () => {
  let editor: TestEditor

  beforeEach(() => {
    editor = new TestEditor()
    editor.setCurrentTool('select')
  })

  it('creates a multi-point stroke with 2D segment metadata', () => {
    const action: TutorAction = {
      type: 'create_stroke',
      id: 'stroke_1',
      x: 100,
      y: 100,
      points: [
        { x: 100, y: 100 },
        { x: 150, y: 120 },
        { x: 200, y: 100 },
      ],
    }

    const [result] = executeTutorActions(editor, [action])
    expect(result.success).toBe(true)

    const shape = findShapeBySemanticId(editor, 'stroke_1')
    expect(shape?.type).toBe('draw')

    const segment = (shape?.props as { segments: Array<{ path: string; dim?: number }> }).segments[0]
    expect(segment.dim).toBe(2)
    expect(b64Vecs.decodePoints(segment.path, 2)).toHaveLength(3)
  })

  it('creates a grouped icon illustration without labels', () => {
    const action: TutorAction = {
      type: 'create_icon',
      icon: 'woman',
      id: 'woman_1',
      x: 200,
      y: 100,
      w: 180,
      h: 180,
    }

    const [result] = executeTutorActions(editor, [action])
    expect(result.success).toBe(true)

    const groupShape = findShapeBySemanticId(editor, 'woman_1')
    expect(groupShape?.type).toBe('group')

    const labeledShape = editor.getCurrentPageShapes().find((shape) => {
      if (shape.type !== 'geo' && shape.type !== 'text') return false
      const richText = (shape.props as { richText?: unknown }).richText as
        | { content?: Array<{ content?: Array<{ text?: string }> }> }
        | undefined
      const text = richText?.content?.[0]?.content?.[0]?.text
      return Boolean(text?.trim())
    })
    expect(labeledShape).toBeUndefined()
  })

  it('groups semantic child shapes under a named object id', () => {
    const actions: TutorAction[] = [
      {
        type: 'create_shape',
        shape: 'geo',
        id: 'head_1',
        x: 200,
        y: 100,
        w: 60,
        h: 60,
        geo: 'ellipse',
      },
      {
        type: 'create_shape',
        shape: 'geo',
        id: 'torso_1',
        x: 205,
        y: 180,
        w: 50,
        h: 90,
        geo: 'rectangle',
      },
      {
        type: 'group',
        id: 'woman_1',
        childIds: ['head_1', 'torso_1'],
        label: 'woman',
      },
    ]

    const results = executeTutorActions(editor, actions)
    expect(results.every((result) => result.success)).toBe(true)

    const groupMeta = getShapeMetaForTests(editor, 'woman_1')
    expect(groupMeta?.semanticId).toBe('woman_1')
    expect(groupMeta?.label).toBe('woman')

    const groupShape = findShapeBySemanticId(editor, 'woman_1')
    expect(groupShape?.type).toBe('group')
  })
})
