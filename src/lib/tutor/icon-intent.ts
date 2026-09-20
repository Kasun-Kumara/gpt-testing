import type { TutorResponse } from '@/types/tutor'
import type { TutorCanvasContext } from '@/types/tutor'
import { hasDrawingIntent } from '@/lib/tutor/draw-intent'
import {
  ICON_ALIASES,
  ICON_TYPES,
  type IconType,
  getIconCatalogSummary,
  normalizeIconType,
} from '@/lib/tutor/icons'

const SCENE_MARKERS = [
  'scene',
  'together',
  'and a',
  'and an',
  'with a',
  'with an',
  'next to',
  'beside',
  'landscape',
  'classroom',
  'garden',
  'multiple',
  'several',
]

const DIAGRAM_MARKERS = ['diagram', 'flowchart', 'labeled', 'label', 'annotate', 'architecture']

export function resolveIconFromMessage(message: string): IconType | null {
  const normalized = message.trim().toLowerCase()

  for (const type of ICON_TYPES) {
    for (const alias of ICON_ALIASES[type]) {
      const pattern = new RegExp(`\\b${alias}\\b`, 'i')
      if (pattern.test(normalized)) {
        return type
      }
    }
  }

  return null
}

export function isSceneCompositionRequest(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return SCENE_MARKERS.some((marker) => normalized.includes(marker))
}

export function isDiagramRequest(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return DIAGRAM_MARKERS.some((marker) => normalized.includes(marker))
}

export function isSingleIconRequest(message: string): boolean {
  if (!hasDrawingIntent(message)) {
    return false
  }

  if (isSceneCompositionRequest(message) || isDiagramRequest(message)) {
    return false
  }

  const normalized = message.trim().toLowerCase()
  const matches = ICON_TYPES.filter((type) =>
    ICON_ALIASES[type].some((alias) => new RegExp(`\\b${alias}\\b`, 'i').test(normalized))
  )

  return matches.length === 1
}

function defaultIconPlacement(context: TutorCanvasContext) {
  const size = Math.round(Math.min(context.viewport.w, context.viewport.h) * 0.38)
  const x = Math.round(context.viewport.x + (context.viewport.w - size) / 2)
  const y = Math.round(context.viewport.y + (context.viewport.h - size) / 2)
  return { x, y, w: size, h: size }
}

function nextIconId(context: TutorCanvasContext, icon: IconType): string {
  const prefix = icon === 'vehicle' ? 'vehicle' : icon
  const existing = new Set(context.objects.map((object) => object.id))
  let index = 1
  while (existing.has(`${prefix}_${index}`)) {
    index += 1
  }
  return `${prefix}_${index}`
}

export function buildIconShortcutResponse(
  message: string,
  context: TutorCanvasContext
): TutorResponse | null {
  if (!hasDrawingIntent(message) || !isSingleIconRequest(message)) {
    return null
  }

  const icon = resolveIconFromMessage(message)
  if (!icon) {
    return null
  }

  const placement = defaultIconPlacement(context)
  const id = nextIconId(context, icon)

  return {
    actions: [
      {
        type: 'create_icon',
        icon,
        id,
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
      },
    ],
    assistantMessage: `Drew a clean ${icon} icon on the whiteboard.`,
  }
}

export function getIconPromptCatalog(): string {
  return getIconCatalogSummary()
}

export function coerceIconType(value: string): IconType | null {
  return normalizeIconType(value)
}
