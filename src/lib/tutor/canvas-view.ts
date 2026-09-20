import type { Editor } from 'tldraw'

/** Default stroke/fill palette on the dark tutor canvas. */
export const TUTOR_DRAW_COLOR = 'white'

export function syncEditorViewport(editor: Editor, container: HTMLElement) {
  const canvas = container.querySelector('.tl-canvas')
  if (canvas instanceof HTMLElement) {
    editor.updateViewportScreenBounds(canvas)
  }
}

export function fitCanvasToContent(editor: Editor) {
  const bounds = editor.getCurrentPageBounds()
  if (!bounds || bounds.w < 1 || bounds.h < 1) {
    return
  }

  editor.zoomToFit({ animation: { duration: 280 } })
}

export function prepareTutorCanvas(editor: Editor, container: HTMLElement) {
  editor.updateInstanceState({ isFocusMode: false })

  const sync = () => syncEditorViewport(editor, container)

  sync()
  requestAnimationFrame(() => {
    sync()
    fitCanvasToContent(editor)
  })

  const resizeObserver = new ResizeObserver(() => {
    sync()
  })
  resizeObserver.observe(container)

  return () => resizeObserver.disconnect()
}
