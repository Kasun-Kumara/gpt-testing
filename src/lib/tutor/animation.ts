import type { Editor } from 'tldraw'
import type { TutorAction } from '@/lib/tutor/actions'
import { fitCanvasToContent, syncEditorViewport } from '@/lib/tutor/canvas-view'
import type { TutorStatus } from '@/types/tutor'

const ACTION_DELAY_MS = 180

export function statusForAction(action: TutorAction): TutorStatus {
  switch (action.type) {
    case 'delete':
    case 'clear_ai_shapes':
      return 'erasing'
    case 'laser':
      return 'pointing'
    case 'highlight':
      return 'highlighting'
    case 'message':
      return 'idle'
    case 'create_icon':
      return 'drawing'
    default:
      return 'drawing'
  }
}

export async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runWithActionDelay<T>(fn: () => T | Promise<T>): Promise<T> {
  await delay(ACTION_DELAY_MS)
  return fn()
}

export function revealDrawnContent(editor: Editor) {
  syncEditorViewport(editor, editor.getContainer())
  fitCanvasToContent(editor)
}
