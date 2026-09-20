import { beforeEach, describe, expect, it } from 'vitest'
import { TestEditor } from 'tldraw/src/test/TestEditor'

import type { TutorAction } from '@/lib/tutor/actions'
import { executeTutorActions } from '@/lib/tutor/executor'
import { findShapeBySemanticId } from '@/lib/tutor/selectors'

describe('label centering', () => {
  let editor: TestEditor

  beforeEach(() => {
    editor = new TestEditor()
    editor.setCurrentTool('select')
  })

  it('centers geo shape label props', () => {
    const action: TutorAction = {
      type: 'create_shape',
      shape: 'geo',
      id: 'rectangle_1',
      x: 100,
      y: 100,
      w: 200,
      h: 100,
      geo: 'rectangle',
      text: 'Input',
    }

    const [result] = executeTutorActions(editor, [action])
    expect(result.success).toBe(true)

    const shape = findShapeBySemanticId(editor, 'rectangle_1')
    expect(shape?.type).toBe('geo')
    const props = shape?.props as {
      align?: string
      verticalAlign?: string
      scale?: number
      richText?: unknown
    }
    expect(props.align).toBe('middle')
    expect(props.verticalAlign).toBe('middle')
    expect(props.scale).toBe(1)
  })

  it('uses label field as visible text when text is omitted', () => {
    const action: TutorAction = {
      type: 'create_shape',
      shape: 'geo',
      id: 'rectangle_2',
      x: 100,
      y: 100,
      w: 200,
      h: 100,
      geo: 'rectangle',
      label: 'Input',
    }

    const [result] = executeTutorActions(editor, [action])
    expect(result.success).toBe(true)

    const shape = findShapeBySemanticId(editor, 'rectangle_2')
    const props = shape?.props as {
      richText?: { content?: Array<{ content?: Array<{ text?: string }> }> }
    }
    expect(props.richText?.content?.[0]?.content?.[0]?.text).toBe('Input')
  })

  it('centers standalone text shapes on their anchor point', () => {
    const action: TutorAction = {
      type: 'create_text',
      id: 'text_1',
      x: 300,
      y: 200,
      text: 'Start',
    }

    const [result] = executeTutorActions(editor, [action])
    expect(result.success).toBe(true)

    const shape = findShapeBySemanticId(editor, 'text_1')
    expect(shape?.type).toBe('text')
    const props = shape?.props as { textAlign?: string }
    expect(props.textAlign).toBe('middle')

    const bounds = editor.getShapePageBounds(shape!.id)
    expect(bounds).toBeTruthy()
    expect(bounds!.midX).toBeCloseTo(300, 0)
    expect(bounds!.midY).toBeCloseTo(200, 0)
  })
})
