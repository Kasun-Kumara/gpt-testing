import {
  b64Vecs,
  createShapeId,
  toRichText,
  type Editor,
  type JsonObject,
  type TLDefaultColorStyle,
  type TLDefaultFillStyle,
  type TLDefaultSizeStyle,
  type TLShapeId,
} from 'tldraw'
import type { TutorAction } from '@/lib/tutor/actions'
import { isDestructiveAction } from '@/lib/tutor/actions'
import { getArrowBindingAnchors, resolveArrowBend } from '@/lib/tutor/arrow-utils'
import { expandIconToActions } from '@/lib/tutor/icons'
import { resolveVisibleLabelText } from '@/lib/tutor/label-text'
import {
  findShapeBySemanticId,
  findTldrawIdBySemanticId,
  getAiShapes,
  getShapeMeta,
  resolveConnectableShapeId,
} from '@/lib/tutor/selectors'
import { buildArrowShapeUpdate, buildGeoShapeUpdate, buildTextShapeUpdate } from '@/lib/tutor/update-props'
import type { ExecutionResult, HighlightOverlayState, LaserOverlayState, ShapeMeta } from '@/types/tutor'

const DEFAULT_LASER_DURATION = 1500
const DEFAULT_HIGHLIGHT_DURATION = 2000

function buildMeta(action: TutorAction & { id?: string; label?: string }): JsonObject {
  const semanticId = 'id' in action && typeof action.id === 'string' ? action.id : undefined
  return {
    semanticId,
    label: 'label' in action && action.label ? action.label : semanticId?.replace(/_\d+$/, '').replace(/_/g, ' '),
    createdBy: 'ai',
    createdAt: Date.now(),
  }
}

function resolveLaserPoint(
  editor: Editor,
  action: Extract<TutorAction, { type: 'laser' }>
): { x: number; y: number } | null {
  if (action.targetId) {
    const shape = findShapeBySemanticId(editor, action.targetId)
    if (!shape) return null
    const bounds = editor.getShapePageBounds(shape.id)
    if (!bounds) return null
    return { x: bounds.center.x, y: bounds.center.y }
  }

  if (typeof action.x === 'number' && typeof action.y === 'number') {
    return { x: action.x, y: action.y }
  }

  return null
}

interface CreateArrowOptions {
  color?: TLDefaultColorStyle
  text?: string
  bend?: number
}

function createArrowBetweenShapes(
  editor: Editor,
  arrowId: TLShapeId,
  startShapeId: TLShapeId,
  endShapeId: TLShapeId,
  options: CreateArrowOptions = {}
) {
  const startBounds = editor.getShapePageBounds(startShapeId)
  const endBounds = editor.getShapePageBounds(endShapeId)
  if (!startBounds || !endBounds) {
    throw new Error('Could not resolve arrow endpoints')
  }

  const isSelfLoop = startShapeId === endShapeId
  const anchors = getArrowBindingAnchors(isSelfLoop, startBounds, endBounds)
  const bend = resolveArrowBend(options.bend, isSelfLoop, startBounds)
  const arrowProps: Record<string, unknown> = {
    kind: 'arc',
    bend,
  }

  if (options.color) {
    arrowProps.color = options.color
  }
  if (options.text !== undefined) {
    arrowProps.richText = toRichText(options.text)
    arrowProps.labelPosition = 0.5
    arrowProps.font = 'draw'
    arrowProps.scale = 1
    arrowProps.labelColor = options.color ?? 'black'
  }

  editor.createShape({
    id: arrowId,
    type: 'arrow',
    x: startBounds.center.x,
    y: startBounds.center.y,
    props: arrowProps,
  })

  editor.createBindings([
    {
      fromId: arrowId,
      toId: startShapeId,
      type: 'arrow',
      props: {
        terminal: 'start',
        normalizedAnchor: anchors.start,
        isExact: false,
        isPrecise: false,
      },
    },
    {
      fromId: arrowId,
      toId: endShapeId,
      type: 'arrow',
      props: {
        terminal: 'end',
        normalizedAnchor: anchors.end,
        isExact: false,
        isPrecise: false,
      },
    },
  ])
}

function centerTextShapeAtPoint(
  editor: Editor,
  shapeId: TLShapeId,
  centerX: number,
  centerY: number
) {
  const bounds = editor.getShapePageBounds(shapeId)
  if (!bounds) {
    return
  }

  editor.updateShape({
    id: shapeId,
    type: 'text',
    x: centerX - bounds.w / 2,
    y: centerY - bounds.h / 2,
    props: {
      textAlign: 'middle',
    },
  })
}

function executeSingleAction(editor: Editor, action: TutorAction): ExecutionResult {
  switch (action.type) {
    case 'create_shape': {
      const shapeId = createShapeId()
      const labelText = resolveVisibleLabelText(action)
      editor.createShape({
        id: shapeId,
        type: 'geo',
        x: action.x,
        y: action.y,
        meta: buildMeta(action),
        props: {
          geo: action.geo,
          w: action.w,
          h: action.h,
          richText: labelText ? toRichText(labelText) : toRichText(''),
          color: (action.color ?? 'black') as TLDefaultColorStyle,
          labelColor: (action.color ?? 'black') as TLDefaultColorStyle,
          fill: (action.fill ?? 'none') as TLDefaultFillStyle,
          dash: 'draw',
          size: 'm',
          font: 'draw',
          align: 'middle',
          verticalAlign: 'middle',
          growY: 0,
          scale: 1,
          flipX: false,
          flipY: false,
          url: '',
        },
      })
      return { success: true, action }
    }

    case 'create_text': {
      const shapeId = createShapeId()
      editor.createShape({
        id: shapeId,
        type: 'text',
        x: action.x,
        y: action.y,
        meta: buildMeta(action),
        props: {
          richText: toRichText(action.text),
          color: (action.color ?? 'black') as TLDefaultColorStyle,
          size: action.size ?? 'm',
          font: 'draw',
          autoSize: true,
          textAlign: 'middle',
          scale: 1,
          w: 8,
        },
      })
      centerTextShapeAtPoint(editor, shapeId, action.x, action.y)
      return { success: true, action }
    }

    case 'create_line': {
      const shapeId = createShapeId()
      const minX = Math.min(action.x1, action.x2)
      const minY = Math.min(action.y1, action.y2)
      editor.createShape({
        id: shapeId,
        type: 'draw',
        x: minX,
        y: minY,
        meta: buildMeta(action),
        props: {
          color: (action.color ?? 'black') as TLDefaultColorStyle,
          fill: 'none',
          dash: 'solid',
          size: 'm',
          segments: [
            {
              type: 'straight',
              path: b64Vecs.encodePoints(
                [
                  { x: action.x1 - minX, y: action.y1 - minY },
                  { x: action.x2 - minX, y: action.y2 - minY },
                ],
                2
              ),
              dim: 2,
            },
          ],
          isComplete: true,
          isClosed: false,
          isPen: false,
          scale: 1,
        },
      })
      return { success: true, action }
    }

    case 'create_stroke': {
      const shapeId = createShapeId()
      const normalizedPoints = action.points.map((point) => ({
        x: point.x - action.x,
        y: point.y - action.y,
      }))
      const isClosed = action.closed ?? false
      editor.createShape({
        id: shapeId,
        type: 'draw',
        x: action.x,
        y: action.y,
        meta: buildMeta(action),
        props: {
          color: (action.color ?? 'black') as TLDefaultColorStyle,
          fill: (isClosed ? (action.fill ?? 'solid') : 'none') as TLDefaultFillStyle,
          dash: 'solid',
          size: (action.size ?? 'm') as TLDefaultSizeStyle,
          segments: [
            {
              type: 'free',
              path: b64Vecs.encodePoints(normalizedPoints, 2),
              dim: 2,
            },
          ],
          isComplete: true,
          isClosed,
          isPen: false,
          scale: 1,
        },
      })
      return { success: true, action }
    }

    case 'create_icon': {
      const expanded = expandIconToActions({
        icon: action.icon,
        id: action.id,
        x: action.x,
        y: action.y,
        w: action.w,
        h: action.h,
        color: action.color,
      })

      for (const childAction of expanded) {
        const childResult = executeSingleAction(editor, childAction)
        if (!childResult.success) {
          return childResult
        }
      }

      return { success: true, action }
    }

    case 'group': {
      const childShapeIds: TLShapeId[] = []
      for (const childId of action.childIds) {
        const shapeId = findTldrawIdBySemanticId(editor, childId)
        if (!shapeId) {
          return { success: false, action, error: `Shape not found: ${childId}` }
        }
        childShapeIds.push(shapeId)
      }

      if (childShapeIds.length < 2) {
        return { success: false, action, error: 'Group requires at least 2 shapes' }
      }

      const groupId = createShapeId()
      editor.setCurrentTool('select')
      editor.groupShapes(childShapeIds, { groupId, select: false })
      editor.updateShape({
        id: groupId,
        type: 'group',
        meta: buildMeta(action),
      })
      return { success: true, action }
    }

    case 'create_arrow': {
      const fromShapeId = resolveConnectableShapeId(editor, action.fromId)
      const toShapeId = resolveConnectableShapeId(editor, action.toId)
      if (!fromShapeId || !toShapeId) {
        return {
          success: false,
          action,
          error: `Could not resolve arrow endpoints: ${action.fromId} -> ${action.toId}`,
        }
      }

      if (fromShapeId === toShapeId && action.fromId !== action.toId) {
        return {
          success: false,
          action,
          error: `Arrow endpoints resolved to the same object: ${action.fromId} -> ${action.toId}. Use top-level object IDs such as woman_1 and vehicle_1.`,
        }
      }

      const arrowId = createShapeId()
      editor.run(() => {
        createArrowBetweenShapes(editor, arrowId, fromShapeId, toShapeId, {
          color: action.color as TLDefaultColorStyle | undefined,
          text: resolveVisibleLabelText(action),
          bend: action.bend,
        })
        editor.updateShape({
          id: arrowId,
          type: 'arrow',
          meta: buildMeta(action),
        })
      })
      return { success: true, action }
    }

    case 'update': {
      const shape = findShapeBySemanticId(editor, action.id)
      if (!shape) {
        return { success: false, action, error: `Shape not found: ${action.id}` }
      }

      if (shape.type === 'geo') {
        editor.updateShape(
          buildGeoShapeUpdate(shape, {
            x: action.props.x,
            y: action.props.y,
            w: action.props.w,
            h: action.props.h,
            color: action.props.color as TLDefaultColorStyle | undefined,
            fill: action.props.fill as TLDefaultFillStyle | undefined,
            text: action.props.text,
          })
        )
      } else if (shape.type === 'text') {
        editor.updateShape(
          buildTextShapeUpdate(shape, {
            x: action.props.x,
            y: action.props.y,
            color: action.props.color as TLDefaultColorStyle | undefined,
            text: action.props.text,
          })
        )
      } else if (shape.type === 'arrow') {
        editor.updateShape(
          buildArrowShapeUpdate(shape, {
            x: action.props.x,
            y: action.props.y,
            color: action.props.color as TLDefaultColorStyle | undefined,
            text: action.props.text,
            bend: action.props.bend,
          })
        )
      } else {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          x: action.props.x ?? shape.x,
          y: action.props.y ?? shape.y,
        })
      }

      return { success: true, action }
    }

    case 'delete': {
      const ids: TLShapeId[] = []
      for (const semanticId of action.ids) {
        const shapeId = findTldrawIdBySemanticId(editor, semanticId)
        if (!shapeId) {
          return { success: false, action, error: `Shape not found: ${semanticId}` }
        }
        ids.push(shapeId)
      }
      editor.deleteShapes(ids)
      return { success: true, action }
    }

    case 'clear_ai_shapes': {
      const aiShapeIds = getAiShapes(editor).map((shape) => shape.id)
      if (aiShapeIds.length > 0) {
        editor.deleteShapes(aiShapeIds)
      }
      return { success: true, action }
    }

    case 'focus': {
      const shapeIds: TLShapeId[] = []
      for (const semanticId of action.ids) {
        const shapeId = findTldrawIdBySemanticId(editor, semanticId)
        if (!shapeId) {
          return { success: false, action, error: `Shape not found: ${semanticId}` }
        }
        shapeIds.push(shapeId)
      }

      editor.run(
        () => {
          editor.select(...shapeIds)
          editor.zoomToSelection({ animation: { duration: 250 } })
        },
        { history: 'ignore' }
      )
      return { success: true, action }
    }

    case 'highlight': {
      const shape = findShapeBySemanticId(editor, action.id)
      if (!shape) {
        return { success: false, action, error: `Shape not found: ${action.id}` }
      }
      const bounds = editor.getShapePageBounds(shape.id)
      if (!bounds) {
        return { success: false, action, error: `Could not compute bounds for ${action.id}` }
      }

      const highlight: HighlightOverlayState = {
        semanticId: action.id,
        bounds: { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h },
        durationMs: action.durationMs ?? DEFAULT_HIGHLIGHT_DURATION,
      }
      return { success: true, action, highlight }
    }

    case 'laser': {
      const point = resolveLaserPoint(editor, action)
      if (!point) {
        return {
          success: false,
          action,
          error: action.targetId
            ? `Laser target not found: ${action.targetId}`
            : 'Laser requires targetId or x/y coordinates',
        }
      }

      const laser: LaserOverlayState = {
        point,
        durationMs: action.durationMs ?? DEFAULT_LASER_DURATION,
      }
      return { success: true, action, laser }
    }

    case 'message':
      return { success: true, action }

    default:
      return { success: false, action, error: 'Unknown action type' }
  }
}

export function executeTutorActions(
  editor: Editor,
  actions: TutorAction[],
  options?: { stopOnFailure?: boolean }
): ExecutionResult[] {
  const stopOnFailure = options?.stopOnFailure ?? true
  const results: ExecutionResult[] = []

  editor.run(() => {
    editor.markHistoryStoppingPoint('tutor-actions')

    for (const action of actions) {
      if (action.type === 'message') {
        results.push({ success: true, action })
        continue
      }

      if (action.type === 'highlight' || action.type === 'laser') {
        const result = executeSingleAction(editor, action)
        results.push(result)
        if (!result.success && stopOnFailure) break
        continue
      }

      if (action.type === 'focus') {
        const result = executeSingleAction(editor, action)
        results.push(result)
        if (!result.success && stopOnFailure) break
        continue
      }

      const result = executeSingleAction(editor, action)
      results.push(result)

      if (!result.success && stopOnFailure && isDestructiveAction(action)) {
        break
      }
      if (!result.success && stopOnFailure) {
        break
      }
    }
  })

  return results
}

export function getShapeCenter(editor: Editor, semanticId: string): { x: number; y: number } | null {
  const shape = findShapeBySemanticId(editor, semanticId)
  if (!shape) return null
  const bounds = editor.getShapePageBounds(shape.id)
  if (!bounds) return null
  return { x: bounds.center.x, y: bounds.center.y }
}

export function pagePointToViewport(editor: Editor, point: { x: number; y: number }) {
  return editor.pageToViewport(point)
}

export function getShapeMetaForTests(editor: Editor, semanticId: string): ShapeMeta | undefined {
  const shape = findShapeBySemanticId(editor, semanticId)
  return shape ? getShapeMeta(shape) : undefined
}
