'use client'

import { useEffect, useState } from 'react'
import type { Editor } from 'tldraw'
import type { LaserOverlayState } from '@/types/tutor'

interface LaserPointerProps {
  editor: Editor | null
  laser: LaserOverlayState | null
  onComplete: () => void
}

export function LaserPointer({ editor, laser, onComplete }: LaserPointerProps) {
  const [screenPoint, setScreenPoint] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!editor || !laser) {
      return
    }

    const updatePosition = () => {
      const viewportPoint = editor.pageToViewport(laser.point)
      setScreenPoint(viewportPoint)
    }

    updatePosition()
    const unsubscribe = editor.store.listen(updatePosition)
    const timeout = window.setTimeout(onComplete, laser.durationMs)

    return () => {
      unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [editor, laser, onComplete])

  if (!editor || !laser || !screenPoint) {
    return null
  }

  return (
    <div
      className="laser-pointer"
      style={{
        transform: `translate(${screenPoint.x}px, ${screenPoint.y}px)`,
      }}
      aria-hidden
    />
  )
}
