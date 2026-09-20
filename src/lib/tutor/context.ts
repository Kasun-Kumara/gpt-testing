import type { Editor, TLShapeId } from 'tldraw'
import { LIMITS } from '@/lib/tutor/actions'
import {
  getArrowEndpointSemanticIds,
  getNextSemanticId,
  getSemanticSelection,
  getShapeMeta,
} from '@/lib/tutor/selectors'
import type { CanvasObjectSummary, ConversationMessage, TutorCanvasContext } from '@/types/tutor'

function readRichText(props: {
  richText?: { content?: Array<{ content?: Array<{ text?: string }> }> }
}): string | undefined {
  return props.richText?.content?.[0]?.content?.[0]?.text
}

export function summarizeArrowObject(
  editor: Editor,
  shape: ReturnType<Editor['getCurrentPageShapes']>[number],
  summary: CanvasObjectSummary
): CanvasObjectSummary {
  if (shape.type !== 'arrow' || !('props' in shape)) {
    return summary
  }

  const props = shape.props as {
    color?: string
    bend?: number
    richText?: { content?: Array<{ content?: Array<{ text?: string }> }> }
  }

  summary.type = 'arrow'
  summary.color = props.color
  summary.bend = props.bend

  const text = readRichText(props)
  if (text) summary.text = text

  const endpoints = getArrowEndpointSemanticIds(editor, shape.id as TLShapeId)
  if (endpoints.fromId) summary.fromId = endpoints.fromId
  if (endpoints.toId) summary.toId = endpoints.toId

  return summary
}

function summarizeShape(editor: Editor, shape: ReturnType<Editor['getCurrentPageShapes']>[number]): CanvasObjectSummary | null {
  const meta = getShapeMeta(shape)
  if (!meta.semanticId) {
    return null
  }

  const bounds = editor.getShapePageBounds(shape.id)
  const summary: CanvasObjectSummary = {
    id: meta.semanticId,
    tldrawId: shape.id,
    type: shape.type,
    x: Math.round(shape.x),
    y: Math.round(shape.y),
    createdBy: meta.createdBy,
  }

  if (bounds) {
    summary.w = Math.round(bounds.w)
    summary.h = Math.round(bounds.h)
  }

  if (shape.type === 'geo' && 'props' in shape) {
    const props = shape.props as {
      richText?: { content?: Array<{ content?: Array<{ text?: string }> }> }
      color?: string
      fill?: string
      geo?: string
    }
    summary.type = props.geo ?? 'geo'
    summary.color = props.color
    summary.fill = props.fill
    const text = readRichText(props)
    if (text) summary.text = text
  }

  if (shape.type === 'text' && 'props' in shape) {
    const props = shape.props as {
      richText?: { content?: Array<{ content?: Array<{ text?: string }> }> }
      color?: string
    }
    summary.color = props.color
    const text = readRichText(props)
    if (text) summary.text = text
  }

  if (shape.type === 'arrow') {
    return summarizeArrowObject(editor, shape, summary)
  }

  if (shape.type === 'line') {
    summary.type = 'line'
  }

  if (shape.type === 'draw') {
    summary.type = 'stroke'
  }

  if (shape.type === 'group') {
    summary.type = 'group'
  }

  return summary
}

function buildSuggestedIds(editor: Editor) {
  return {
    rectangle: getNextSemanticId(editor, 'rectangle'),
    ellipse: getNextSemanticId(editor, 'ellipse'),
    stroke: getNextSemanticId(editor, 'stroke'),
    line: getNextSemanticId(editor, 'line'),
    arrow: getNextSemanticId(editor, 'arrow'),
    text: getNextSemanticId(editor, 'text'),
    group: getNextSemanticId(editor, 'group'),
    icon: getNextSemanticId(editor, 'icon'),
  }
}

export function buildCanvasContext(
  editor: Editor,
  conversation: ConversationMessage[],
  recentActions: string[]
): TutorCanvasContext {
  const viewport = editor.getViewportPageBounds()
  const objects = editor
    .getCurrentPageShapes()
    .map((shape) => summarizeShape(editor, shape))
    .filter((object): object is CanvasObjectSummary => object !== null)
    .slice(0, LIMITS.maxObjects)

  return {
    viewport: {
      x: Math.round(viewport.x),
      y: Math.round(viewport.y),
      w: Math.round(viewport.w),
      h: Math.round(viewport.h),
    },
    objects,
    selection: getSemanticSelection(editor),
    recentActions: recentActions.slice(-LIMITS.maxRecentActions),
    conversation: conversation.slice(-LIMITS.maxConversationMessages),
    suggestedIds: buildSuggestedIds(editor),
  }
}

export function trimContextForRequest(context: TutorCanvasContext): TutorCanvasContext {
  return {
    ...context,
    objects: context.objects.slice(0, LIMITS.maxObjects),
    selection: context.selection.slice(0, LIMITS.maxActionsPerRequest),
    recentActions: context.recentActions.slice(-LIMITS.maxRecentActions),
    conversation: context.conversation.slice(-LIMITS.maxConversationMessages),
  }
}
