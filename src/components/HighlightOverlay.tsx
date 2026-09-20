'use client'

import { useEffect, useState } from 'react'
import type { Editor } from 'tldraw'
import type { HighlightOverlayState } from '@/types/tutor'

interface HighlightOverlayProps {
  editor: Editor | null
  highlight: HighlightOverlayState | null
  onComplete: () => void
}

export function HighlightOverlay({ editor, highlight, onComplete }: HighlightOverlayProps) {
  const [screenBounds, setScreenBounds] = useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)

  useEffect(() => {
    if (!editor || !highlight) {
      return
    }

    const updateBounds = () => {
      const topLeft = editor.pageToViewport({ x: highlight.bounds.x, y: highlight.bounds.y })
      const bottomRight = editor.pageToViewport({
        x: highlight.bounds.x + highlight.bounds.w,
        y: highlight.bounds.y + highlight.bounds.h,
      })
      setScreenBounds({
        x: topLeft.x,
        y: topLeft.y,
        w: Math.max(8, bottomRight.x - topLeft.x),
        h: Math.max(8, bottomRight.y - topLeft.y),
      })
    }

    updateBounds()
    const unsubscribe = editor.store.listen(updateBounds)
    const timeout = window.setTimeout(onComplete, highlight.durationMs)

    return () => {
      unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [editor, highlight, onComplete])

  if (!editor || !highlight || !screenBounds) {
    return null
  }

  return (
    <div
      className="highlight-overlay"
      style={{
        left: screenBounds.x,
        top: screenBounds.y,
        width: screenBounds.w,
        height: screenBounds.h,
      }}
      aria-hidden
    />
  )
}
