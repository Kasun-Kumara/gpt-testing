'use client'

import { useEffect, useRef } from 'react'
import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'

import { prepareTutorCanvas } from '@/lib/tutor/canvas-view'

const PERSISTENCE_KEY = 'ai-whiteboard-tutor-v2'

interface TutorCanvasProps {
  onMount: (editor: Editor) => void
}

export function TutorCanvas({ onMount }: TutorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [])

  return (
    <div ref={containerRef} className="tutor-canvas">
      <Tldraw
        persistenceKey={PERSISTENCE_KEY}
        className="tldraw__editor"
        onMount={(editor) => {
          editor.user.updateUserPreferences({ colorScheme: 'dark' })
          const container = containerRef.current
          if (container) {
            cleanupRef.current?.()
            cleanupRef.current = prepareTutorCanvas(editor, container)
          }
          onMount(editor)
        }}
      />
    </div>
  )
}
