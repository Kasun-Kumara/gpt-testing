import type { TutorAction } from '@/lib/tutor/actions'
import { ICON_TYPES } from '@/lib/tutor/icon-types'
import { hasDrawingIntent } from '@/lib/tutor/draw-intent'
import { isDiagramRequest, resolveIconFromMessage } from '@/lib/tutor/icon-intent'

export { isDiagramRequest } from '@/lib/tutor/icon-intent'
export { hasDrawingIntent } from '@/lib/tutor/draw-intent'

const SIMPLE_PRIMITIVE_PATTERNS = [
  /\bdraw\s+(?:a\s+)?(?:circle|ellipse|round\s+circle|oval)\b/i,
  /\bdraw\s+(?:a\s+)?(?:rectangle|square|box)\b/i,
  /\bdraw\s+(?:a\s+)?line\b/i,
  /\bmake\s+(?:a\s+)?(?:circle|rectangle|square|line|arrow)\b/i,
  /\b(?:circle|rectangle|square|line|arrow)\s+only\b/i,
]

const COMPLEX_SUBJECT_KEYWORDS = [
  'woman',
  'man',
  'person',
  'people',
  'human',
  'girl',
  'boy',
  'child',
  'baby',
  'dog',
  'cat',
  'animal',
  'horse',
  'bird',
  'fish',
  'elephant',
  'lion',
  'bicycle',
  'bike',
  'car',
  'machine',
  'robot',
  'house',
  'building',
  'tree',
  'flower',
  'scene',
  'landscape',
  'classroom',
  'kitchen',
  'garden',
  'architecture',
  'diagram',
  'flowchart',
  'system',
  'vehicle',
  'truck',
  'van',
]

const SCENE_KEYWORDS = ['scene', 'landscape', 'classroom', 'garden', 'kitchen', 'several', 'multiple']

const PART_LABEL_WORDS = [
  'head',
  'torso',
  'body',
  'neck',
  'arm',
  'leg',
  'wheel',
  'cabin',
  'window',
  'door',
  'roof',
  'petal',
  'stem',
  'leaf',
  'eye',
  'ear',
  'tail',
]

const MIN_ICON_SIZE = 48
const MIN_PART_SIZE = 6

export function isSimplePrimitiveRequest(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return SIMPLE_PRIMITIVE_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function isComplexSubjectRequest(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return COMPLEX_SUBJECT_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

export function isSceneRequest(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return SCENE_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

export function countDrawableParts(actions: TutorAction[]): number {
  return actions.filter(
    (action) =>
      action.type === 'create_shape' ||
      action.type === 'create_stroke' ||
      action.type === 'create_line' ||
      action.type === 'create_text' ||
      action.type === 'create_icon'
  ).length
}

function hasCatalogIconMatch(message: string): boolean {
  return resolveIconFromMessage(message) !== null
}

function actionHasUnsolicitedLabel(action: TutorAction): boolean {
  if (action.type !== 'create_shape' && action.type !== 'create_text') {
    return false
  }

  const text = action.type === 'create_shape' ? action.text : action.text
  if (!text?.trim()) {
    return false
  }

  const normalized = text.trim().toLowerCase()
  return PART_LABEL_WORDS.some((word) => normalized === word || normalized.includes(word))
}

function actionHasTinyGeometry(action: TutorAction): boolean {
  if (action.type === 'create_shape') {
    return action.w < MIN_PART_SIZE || action.h < MIN_PART_SIZE
  }
  if (action.type === 'create_icon') {
    return action.w < MIN_ICON_SIZE || action.h < MIN_ICON_SIZE
  }
  return false
}

function actionsOverlapAtSamePoint(actions: TutorAction[]): boolean {
  const points = actions
    .filter((action): action is Extract<TutorAction, { type: 'create_shape' }> => action.type === 'create_shape')
    .map((action) => `${action.x},${action.y},${action.w},${action.h}`)

  return new Set(points).size !== points.length
}

export interface DrawingQualityResult {
  ok: boolean
  feedback?: string
}

export function assessDrawingQuality(message: string, actions: TutorAction[]): DrawingQualityResult {
  const drawableActions = actions.filter((action) => action.type !== 'message')

  if (!hasDrawingIntent(message)) {
    return { ok: true }
  }

  if (drawableActions.length === 0) {
    return {
      ok: false,
      feedback:
        'Return drawable actions for the request. Use create_icon for catalog subjects or multiple clean parts for scenes.',
    }
  }

  if (isSimplePrimitiveRequest(message)) {
    return { ok: true }
  }

  const usesIcon = drawableActions.some((action) => action.type === 'create_icon')
  const diagram = isDiagramRequest(message)

  if (!diagram) {
    const labeledPart = drawableActions.find((action) => actionHasUnsolicitedLabel(action))
    if (labeledPart) {
      return {
        ok: false,
        feedback:
          'Do not place part names such as head, torso, wheel, or cabin inside illustration shapes. Use create_icon for catalog subjects or leave shapes unlabeled.',
      }
    }
  }

  const tinyPart = drawableActions.find((action) => actionHasTinyGeometry(action))
  if (tinyPart) {
    return {
      ok: false,
      feedback:
        'Use balanced proportions with readable part sizes. Prefer create_icon for common objects instead of tiny primitive parts.',
    }
  }

  if (actionsOverlapAtSamePoint(drawableActions)) {
    return {
      ok: false,
      feedback:
        'Avoid stacking multiple parts at the same position. Space parts clearly or use create_icon for a clean illustration.',
    }
  }

  if (usesIcon) {
    const requestedIcon = resolveIconFromMessage(message)
    if (requestedIcon) {
      const wrongIcon = drawableActions.find(
        (action): action is Extract<TutorAction, { type: 'create_icon' }> =>
          action.type === 'create_icon' && action.icon !== requestedIcon
      )
      if (wrongIcon) {
        return {
          ok: false,
          feedback: `The user asked for ${requestedIcon}. Use create_icon with icon "${requestedIcon}" instead of "${wrongIcon.icon}". Never substitute a person icon for another subject.`,
        }
      }
    }
    return { ok: true }
  }

  if (!isComplexSubjectRequest(message)) {
    return { ok: true }
  }

  if (hasCatalogIconMatch(message) && !isSceneRequest(message)) {
    return {
      ok: false,
      feedback: `Use create_icon with a catalog icon (${ICON_TYPES.join(', ')}) for this subject instead of hand-built labeled primitives.`,
    }
  }

  const parts = countDrawableParts(actions)
  const scene = isSceneRequest(message)
  const minParts = scene ? 3 : 5

  if (parts < minParts) {
    return {
      ok: false,
      feedback: `The user asked for a recognizable ${scene ? 'scene' : 'subject'}. Use create_icon actions for catalog objects or at least ${minParts} clean unlabeled parts.`,
    }
  }

  const onlyOnePrimitive =
    parts === 1 && drawableActions.some((action) => action.type === 'create_shape')

  if (onlyOnePrimitive) {
    return {
      ok: false,
      feedback:
        'Do not represent a person, animal, machine, or complex object with one primitive shape. Use create_icon or multiple clean unlabeled parts, then group them.',
    }
  }

  const hasGroup = actions.some((action) => action.type === 'group')
  if (!hasGroup && !scene) {
    return {
      ok: false,
      feedback:
        'Finish with a group action that groups all part semantic IDs under one object id so the whole drawing can be moved or referenced later.',
    }
  }

  return { ok: true }
}

export function sanitizeIllustrationActions(
  message: string,
  actions: TutorAction[]
): TutorAction[] {
  if (isDiagramRequest(message)) {
    return actions
  }

  return actions.map((action) => {
    if (action.type === 'create_shape' && action.text) {
      const { text: _text, ...rest } = action
      return rest
    }

    if (action.type === 'create_arrow' && action.text) {
      const { text: _text, ...rest } = action
      return rest
    }

    return action
  })
}

export function buildQualityRetryPrompt(message: string, feedback: string): string {
  return [
    'User command:',
    message,
    '',
    'Your previous drawing plan was too simple, mislabeled, or poorly proportioned.',
    feedback,
    '',
    'Return a revised JSON tutor response. Prefer create_icon for catalog subjects. Do not add visible part labels unless the user asked for a labeled diagram.',
  ].join('\n')
}
