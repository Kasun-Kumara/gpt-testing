import { z } from 'zod'
import { ICON_TYPES } from '@/lib/tutor/icon-types'

export const LIMITS = {
  maxActionsPerRequest: 50,
  maxTextLength: 2000,
  maxConversationMessages: 20,
  maxRecentActions: 20,
  maxObjects: 200,
  minCoordinate: -10000,
  maxCoordinate: 10000,
  minDimension: 1,
  maxDimension: 5000,
  maxStrokePoints: 500,
  minArrowBend: -500,
  maxArrowBend: 500,
} as const

export const TUTOR_COLORS = [
  'black',
  'grey',
  'light-violet',
  'violet',
  'blue',
  'light-blue',
  'yellow',
  'orange',
  'green',
  'light-green',
  'light-red',
  'red',
  'white',
] as const

export const TUTOR_FILLS = ['none', 'semi', 'solid', 'pattern'] as const

export const TUTOR_GEOS = [
  'rectangle',
  'ellipse',
  'oval',
  'triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'octagon',
  'star',
  'rhombus',
  'rhombus-2',
  'trapezoid',
  'cloud',
  'heart',
  'arrow-right',
  'arrow-left',
  'arrow-up',
  'arrow-down',
  'x-box',
  'check-box',
] as const

export const TUTOR_STROKE_SIZES = ['s', 'm', 'l', 'xl'] as const

const coordinate = z.number().min(LIMITS.minCoordinate).max(LIMITS.maxCoordinate)
const dimension = z.number().min(LIMITS.minDimension).max(LIMITS.maxDimension)
const semanticId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/i, 'Semantic IDs must be alphanumeric with underscores')
const COLOR_DESCRIPTION =
  'tldraw palette color for stroke and filled area; e.g. green makes a filled shape green'
const FILL_DESCRIPTION =
  'fill rendering style only: none, semi, solid, or pattern; does not choose the palette color'

const color = z.enum(TUTOR_COLORS).describe(COLOR_DESCRIPTION)
const fill = z.enum(TUTOR_FILLS).describe(FILL_DESCRIPTION)
const geo = z.enum(TUTOR_GEOS)
const bend = z
  .number()
  .min(LIMITS.minArrowBend)
  .max(LIMITS.maxArrowBend)
  .describe('Arrow arc bend; nonzero values create a curved arrow, especially for self-loops')

const createShapeAction = z.object({
  type: z.literal('create_shape'),
  shape: z.literal('geo'),
  id: semanticId,
  x: coordinate,
  y: coordinate,
  w: dimension,
  h: dimension,
  geo,
  text: z.string().max(LIMITS.maxTextLength).optional(),
  color: color.optional(),
  fill: fill.optional(),
  label: z.string().max(64).optional(),
})

const createTextAction = z.object({
  type: z.literal('create_text'),
  id: semanticId,
  x: coordinate,
  y: coordinate,
  text: z.string().min(1).max(LIMITS.maxTextLength),
  size: z.enum(['s', 'm', 'l', 'xl']).optional(),
  color: color.optional(),
  label: z.string().max(64).optional(),
})

const createArrowAction = z.object({
  type: z.literal('create_arrow'),
  id: semanticId,
  fromId: semanticId,
  toId: semanticId,
  text: z.string().max(LIMITS.maxTextLength).optional(),
  color: color.optional(),
  bend: bend.optional(),
  label: z.string().max(64).optional(),
})

const createLineAction = z.object({
  type: z.literal('create_line'),
  id: semanticId,
  x1: coordinate,
  y1: coordinate,
  x2: coordinate,
  y2: coordinate,
  color: color.optional(),
  label: z.string().max(64).optional(),
})

const strokePoint = z.object({
  x: coordinate,
  y: coordinate,
})

const createStrokeAction = z.object({
  type: z.literal('create_stroke'),
  id: semanticId,
  x: coordinate,
  y: coordinate,
  points: z.array(strokePoint).min(2).max(LIMITS.maxStrokePoints),
  color: color.optional(),
  size: z.enum(TUTOR_STROKE_SIZES).optional(),
  closed: z.boolean().optional(),
  fill: fill.optional(),
  label: z.string().max(64).optional(),
})

const groupAction = z.object({
  type: z.literal('group'),
  id: semanticId,
  childIds: z.array(semanticId).min(2).max(LIMITS.maxActionsPerRequest),
  label: z.string().max(64).optional(),
})

const icon = z.enum(ICON_TYPES)

const createIconAction = z.object({
  type: z.literal('create_icon'),
  icon,
  id: semanticId,
  x: coordinate,
  y: coordinate,
  w: dimension,
  h: dimension,
  color: color.optional(),
  label: z.string().max(64).optional(),
})

const updateProps = z
  .object({
    x: coordinate.optional(),
    y: coordinate.optional(),
    w: dimension.optional(),
    h: dimension.optional(),
    text: z.string().max(LIMITS.maxTextLength).optional(),
    color: color.optional(),
    fill: fill.optional(),
    bend: bend.optional(),
  })
  .refine((props) => Object.keys(props).length > 0, {
    message: 'Update action requires at least one property',
  })

const updateAction = z.object({
  type: z.literal('update'),
  id: semanticId,
  props: updateProps,
})

const deleteAction = z.object({
  type: z.literal('delete'),
  ids: z.array(semanticId).min(1).max(LIMITS.maxActionsPerRequest),
})

const highlightAction = z.object({
  type: z.literal('highlight'),
  id: semanticId,
  durationMs: z.number().min(100).max(10000).optional(),
})

const laserAction = z.object({
  type: z.literal('laser'),
  targetId: semanticId.optional(),
  x: coordinate.optional(),
  y: coordinate.optional(),
  durationMs: z.number().min(100).max(10000).optional(),
})

const clearAiShapesAction = z.object({
  type: z.literal('clear_ai_shapes'),
})

const focusAction = z.object({
  type: z.literal('focus'),
  ids: z.array(semanticId).min(1).max(LIMITS.maxActionsPerRequest),
})

const messageAction = z.object({
  type: z.literal('message'),
  text: z.string().min(1).max(LIMITS.maxTextLength),
})

export const tutorActionSchema = z.discriminatedUnion('type', [
  createShapeAction,
  createTextAction,
  createArrowAction,
  createLineAction,
  createStrokeAction,
  createIconAction,
  groupAction,
  updateAction,
  deleteAction,
  highlightAction,
  laserAction,
  clearAiShapesAction,
  focusAction,
  messageAction,
])

export type TutorAction = z.infer<typeof tutorActionSchema>

const conversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(LIMITS.maxTextLength),
})

const canvasObjectSchema = z.object({
  id: z.string(),
  tldrawId: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number().optional(),
  h: z.number().optional(),
  text: z.string().optional(),
  color: z.string().optional(),
  fill: z.string().optional(),
  label: z.string().optional(),
  createdBy: z.enum(['ai', 'user']).optional(),
  fromId: z.string().optional(),
  toId: z.string().optional(),
  bend: z.number().optional(),
})

const suggestedIdsSchema = z.object({
  rectangle: z.string(),
  ellipse: z.string(),
  stroke: z.string(),
  line: z.string(),
  arrow: z.string(),
  text: z.string(),
  group: z.string(),
  icon: z.string(),
})

export const tutorCanvasContextSchema = z.object({
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  objects: z.array(canvasObjectSchema).max(LIMITS.maxObjects),
  selection: z.array(z.string()).max(LIMITS.maxActionsPerRequest),
  recentActions: z.array(z.string()).max(LIMITS.maxRecentActions),
  conversation: z.array(conversationMessageSchema).max(LIMITS.maxConversationMessages),
  suggestedIds: suggestedIdsSchema.optional(),
})

export const tutorRequestSchema = z.object({
  message: z.string().min(1).max(LIMITS.maxTextLength),
  context: tutorCanvasContextSchema,
})

export const tutorResponseSchema = z.object({
  actions: z.array(tutorActionSchema).max(LIMITS.maxActionsPerRequest),
  assistantMessage: z.string().max(LIMITS.maxTextLength),
})

// OpenAI/Azure structured outputs require every field to be present; use null instead of omitting.
const nullableText = z.string().max(LIMITS.maxTextLength).nullable()
const nullableLabel = z.string().max(64).nullable()
const nullableColor = color.nullable()
const nullableFill = fill.nullable()
const nullableSize = z.enum(['s', 'm', 'l', 'xl']).nullable()
const nullableDuration = z.number().min(100).max(10000).nullable()
const nullableCoordinate = coordinate.nullable()
const nullableSemanticId = semanticId.nullable()
const nullableBend = bend.nullable()

const createShapeActionProvider = z.object({
  type: z.literal('create_shape'),
  shape: z.literal('geo'),
  id: semanticId,
  x: coordinate,
  y: coordinate,
  w: dimension,
  h: dimension,
  geo,
  text: nullableText,
  color: nullableColor,
  fill: nullableFill,
  label: nullableLabel,
})

const createTextActionProvider = z.object({
  type: z.literal('create_text'),
  id: semanticId,
  x: coordinate,
  y: coordinate,
  text: z.string().min(1).max(LIMITS.maxTextLength),
  size: nullableSize,
  color: nullableColor,
  label: nullableLabel,
})

const createArrowActionProvider = z.object({
  type: z.literal('create_arrow'),
  id: semanticId,
  fromId: semanticId,
  toId: semanticId,
  text: nullableText,
  color: nullableColor,
  bend: nullableBend,
  label: nullableLabel,
})

const createLineActionProvider = z.object({
  type: z.literal('create_line'),
  id: semanticId,
  x1: coordinate,
  y1: coordinate,
  x2: coordinate,
  y2: coordinate,
  color: nullableColor,
  label: nullableLabel,
})

const createStrokeActionProvider = z.object({
  type: z.literal('create_stroke'),
  id: semanticId,
  x: coordinate,
  y: coordinate,
  points: z.array(strokePoint).min(2).max(LIMITS.maxStrokePoints),
  color: nullableColor,
  size: nullableSize,
  closed: z.boolean().nullable(),
  fill: nullableFill,
  label: nullableLabel,
})

const groupActionProvider = z.object({
  type: z.literal('group'),
  id: semanticId,
  childIds: z.array(semanticId).min(2).max(LIMITS.maxActionsPerRequest),
  label: nullableLabel,
})

const createIconActionProvider = z.object({
  type: z.literal('create_icon'),
  icon,
  id: semanticId,
  x: coordinate,
  y: coordinate,
  w: dimension,
  h: dimension,
  color: nullableColor,
  label: nullableLabel,
})

const updatePropsProvider = z.object({
  x: nullableCoordinate,
  y: nullableCoordinate,
  w: dimension.nullable(),
  h: dimension.nullable(),
  text: nullableText,
  color: nullableColor,
  fill: nullableFill,
  bend: nullableBend,
})

const updateActionProvider = z.object({
  type: z.literal('update'),
  id: semanticId,
  props: updatePropsProvider,
})

const highlightActionProvider = z.object({
  type: z.literal('highlight'),
  id: semanticId,
  durationMs: nullableDuration,
})

const laserActionProvider = z.object({
  type: z.literal('laser'),
  targetId: nullableSemanticId,
  x: nullableCoordinate,
  y: nullableCoordinate,
  durationMs: nullableDuration,
})

export const tutorActionProviderSchema = z.discriminatedUnion('type', [
  createShapeActionProvider,
  createTextActionProvider,
  createArrowActionProvider,
  createLineActionProvider,
  createStrokeActionProvider,
  createIconActionProvider,
  groupActionProvider,
  updateActionProvider,
  deleteAction,
  highlightActionProvider,
  laserActionProvider,
  clearAiShapesAction,
  focusAction,
  messageAction,
])

export type TutorActionProvider = z.infer<typeof tutorActionProviderSchema>

export const tutorResponseProviderSchema = z.object({
  actions: z.array(tutorActionProviderSchema).max(LIMITS.maxActionsPerRequest),
  assistantMessage: z.string().max(LIMITS.maxTextLength),
})

function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

function compactOptional<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== null && field !== undefined)
  ) as Partial<{ [K in keyof T]: Exclude<T[K], null | undefined> }>
}

export function normalizeProviderAction(action: TutorActionProvider): TutorAction {
  switch (action.type) {
    case 'create_shape':
      return {
        type: 'create_shape',
        shape: 'geo',
        id: action.id,
        x: action.x,
        y: action.y,
        w: action.w,
        h: action.h,
        geo: action.geo,
        ...compactOptional({
          text: nullToUndefined(action.text),
          color: nullToUndefined(action.color),
          fill: nullToUndefined(action.fill),
          label: nullToUndefined(action.label),
        }),
      }
    case 'create_text':
      return {
        type: 'create_text',
        id: action.id,
        x: action.x,
        y: action.y,
        text: action.text,
        ...compactOptional({
          size: nullToUndefined(action.size),
          color: nullToUndefined(action.color),
          label: nullToUndefined(action.label),
        }),
      }
    case 'create_arrow':
      return {
        type: 'create_arrow',
        id: action.id,
        fromId: action.fromId,
        toId: action.toId,
        ...compactOptional({
          text: nullToUndefined(action.text),
          color: nullToUndefined(action.color),
          bend: nullToUndefined(action.bend),
          label: nullToUndefined(action.label),
        }),
      }
    case 'create_line':
      return {
        type: 'create_line',
        id: action.id,
        x1: action.x1,
        y1: action.y1,
        x2: action.x2,
        y2: action.y2,
        ...compactOptional({
          color: nullToUndefined(action.color),
          label: nullToUndefined(action.label),
        }),
      }
    case 'create_stroke':
      return {
        type: 'create_stroke',
        id: action.id,
        x: action.x,
        y: action.y,
        points: action.points,
        ...compactOptional({
          color: nullToUndefined(action.color),
          size: nullToUndefined(action.size),
          closed: nullToUndefined(action.closed),
          fill: nullToUndefined(action.fill),
          label: nullToUndefined(action.label),
        }),
      }
    case 'create_icon':
      return {
        type: 'create_icon',
        icon: action.icon,
        id: action.id,
        x: action.x,
        y: action.y,
        w: action.w,
        h: action.h,
        ...compactOptional({
          color: nullToUndefined(action.color),
          label: nullToUndefined(action.label),
        }),
      }
    case 'group':
      return {
        type: 'group',
        id: action.id,
        childIds: action.childIds,
        ...compactOptional({
          label: nullToUndefined(action.label),
        }),
      }
    case 'update':
      return {
        type: 'update',
        id: action.id,
        props: compactOptional({
          x: nullToUndefined(action.props.x),
          y: nullToUndefined(action.props.y),
          w: nullToUndefined(action.props.w),
          h: nullToUndefined(action.props.h),
          text: nullToUndefined(action.props.text),
          color: nullToUndefined(action.props.color),
          fill: nullToUndefined(action.props.fill),
          bend: nullToUndefined(action.props.bend),
        }),
      }
    case 'highlight':
      return {
        type: 'highlight',
        id: action.id,
        ...compactOptional({
          durationMs: nullToUndefined(action.durationMs),
        }),
      }
    case 'laser':
      return {
        type: 'laser',
        ...compactOptional({
          targetId: nullToUndefined(action.targetId),
          x: nullToUndefined(action.x),
          y: nullToUndefined(action.y),
          durationMs: nullToUndefined(action.durationMs),
        }),
      }
    default:
      return action
  }
}

export function normalizeTutorResponse(
  response: z.infer<typeof tutorResponseProviderSchema>
): z.infer<typeof tutorResponseSchema> {
  return {
    assistantMessage: response.assistantMessage,
    actions: response.actions.map(normalizeProviderAction),
  }
}

export function clampCoordinate(value: number): number {
  return Math.min(LIMITS.maxCoordinate, Math.max(LIMITS.minCoordinate, value))
}

export function clampDimension(value: number): number {
  return Math.min(LIMITS.maxDimension, Math.max(LIMITS.minDimension, value))
}

export function isDestructiveAction(action: TutorAction): boolean {
  return action.type === 'delete' || action.type === 'clear_ai_shapes'
}

export function describeAction(action: TutorAction): string {
  switch (action.type) {
    case 'create_shape':
      return `created ${action.id}`
    case 'create_text':
      return `created text ${action.id}`
    case 'create_arrow':
      return `created arrow ${action.id}`
    case 'create_line':
      return `created line ${action.id}`
    case 'create_stroke':
      return `created stroke ${action.id}`
    case 'create_icon':
      return `created icon ${action.id}`
    case 'group':
      return `grouped ${action.id}`
    case 'update':
      return `updated ${action.id}`
    case 'delete':
      return `deleted ${action.ids.join(', ')}`
    case 'highlight':
      return `highlighted ${action.id}`
    case 'laser':
      return action.targetId ? `pointed at ${action.targetId}` : 'pointed laser'
    case 'clear_ai_shapes':
      return 'cleared AI shapes'
    case 'focus':
      return `focused ${action.ids.join(', ')}`
    case 'message':
      return 'sent message'
    default:
      return 'unknown action'
  }
}
