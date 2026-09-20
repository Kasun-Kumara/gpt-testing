import type { Editor } from 'tldraw'
import type { TutorAction } from '@/lib/tutor/actions'
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
  const bounds = editor.getCurrentPageBounds()
  if (!bounds || bounds.w < 1 || bounds.h < 1) {
    return
  }

  const viewport = editor.getViewportPageBounds()
  if (viewport.w < 16 || viewport.h < 16) {
    return
  }

  const fullyVisible =
    bounds.x >= viewport.x &&
    bounds.y >= viewport.y &&
    bounds.x + bounds.w <= viewport.x + viewport.w &&
    bounds.y + bounds.h <= viewport.y + viewport.h

  if (fullyVisible) {
    return
  }

  editor.zoomToBounds(bounds, { animation: { duration: 280 } })
}
