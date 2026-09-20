import type { TutorAction } from '@/lib/tutor/actions'

export type ConversationRole = 'user' | 'assistant'

export interface ConversationMessage {
  role: ConversationRole
  content: string
}

export interface CanvasObjectSummary {
  id: string
  tldrawId: string
  type: string
  x: number
  y: number
  w?: number
  h?: number
  text?: string
  color?: string
  fill?: string
  label?: string
  createdBy?: 'ai' | 'user'
  fromId?: string
  toId?: string
  bend?: number
}

export interface CanvasViewport {
  x: number
  y: number
  w: number
  h: number
}

export interface SuggestedSemanticIds {
  rectangle: string
  ellipse: string
  stroke: string
  line: string
  arrow: string
  text: string
  group: string
  icon: string
}

export interface TutorCanvasContext {
  viewport: CanvasViewport
  objects: CanvasObjectSummary[]
  selection: string[]
  recentActions: string[]
  conversation: ConversationMessage[]
  suggestedIds?: SuggestedSemanticIds
}

export interface TutorRequest {
  message: string
  context: TutorCanvasContext
}

export interface TutorResponse {
  actions: TutorAction[]
  assistantMessage: string
}

export type TutorStatus =
  | 'idle'
  | 'thinking'
  | 'drawing'
  | 'erasing'
  | 'pointing'
  | 'highlighting'
  | 'error'

export interface ActionLogEntry {
  id: string
  timestamp: number
  source: 'ai' | 'user' | 'system'
  userMessageId?: string
  action: TutorAction
  status: 'applied' | 'failed' | 'skipped'
  error?: string
}

export interface TutorInput {
  message: string
  context: TutorCanvasContext
}

export interface TutorResult {
  actions: TutorAction[]
  assistantMessage: string
  actionLog: ActionLogEntry[]
  error?: string
}

export interface ShapeMeta extends Record<string, unknown> {
  semanticId?: string
  label?: string
  createdBy?: 'ai' | 'user'
  createdAt?: number
}

export interface OverlayPoint {
  x: number
  y: number
}

export interface LaserOverlayState {
  point: OverlayPoint
  durationMs: number
}

export interface HighlightOverlayState {
  semanticId: string
  bounds: { x: number; y: number; w: number; h: number }
  durationMs: number
}

export interface ExecutionResult {
  success: boolean
  action: TutorAction
  error?: string
  laser?: LaserOverlayState
  highlight?: HighlightOverlayState
}
