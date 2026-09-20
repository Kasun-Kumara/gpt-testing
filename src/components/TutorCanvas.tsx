'use client'

import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'

const PERSISTENCE_KEY = 'ai-whiteboard-tutor-v2'

interface TutorCanvasProps {
  onMount: (editor: Editor) => void
}

export function TutorCanvas({ onMount }: TutorCanvasProps) {
  return (
    <div className="tutor-canvas">
      <Tldraw
        persistenceKey={PERSISTENCE_KEY}
        className="tldraw__editor"
        onMount={(editor) => {
          editor.user.updateUserPreferences({ colorScheme: 'dark' })
          onMount(editor)
        }}
      />
    </div>
  )
}
