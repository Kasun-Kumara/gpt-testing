import { TUTOR_COLORS, TUTOR_GEOS, type TutorAction } from '@/lib/tutor/actions'
import { ICON_TYPES, type IconType } from '@/lib/tutor/icon-types'

export { ICON_TYPES, type IconType } from '@/lib/tutor/icon-types'

export type TutorColor = (typeof TUTOR_COLORS)[number]
type TutorGeo = (typeof TUTOR_GEOS)[number]

export const ICON_ALIASES: Record<IconType, string[]> = {
  woman: ['woman', 'girl', 'lady', 'female'],
  person: ['person', 'people', 'human'],
  man: ['man', 'boy', 'male', 'guy'],
  car: ['car', 'automobile', 'sedan'],
  vehicle: ['vehicle', 'truck', 'van', 'bus'],
  bicycle: ['bicycle', 'bike', 'cycle'],
  dog: ['dog', 'puppy', 'canine'],
  cat: ['cat', 'kitten', 'feline'],
  tree: ['tree', 'pine', 'oak'],
  house: ['house', 'home', 'building'],
  flower: ['flower', 'bloom', 'rose'],
  robot: ['robot', 'android', 'bot'],
}

type GeoPart = {
  kind: 'geo'
  part: string
  rx: number
  ry: number
  rw: number
  rh: number
  geo: TutorGeo
  color?: TutorColor
  fill?: 'none' | 'semi' | 'solid' | 'pattern'
}

type LinePart = {
  kind: 'line'
  part: string
  x1: number
  y1: number
  x2: number
  y2: number
  color?: TutorColor
}

type StrokePart = {
  kind: 'stroke'
  part: string
  points: Array<{ x: number; y: number }>
  color?: TutorColor
  closed?: boolean
  fill?: 'none' | 'semi' | 'solid' | 'pattern'
}

type IconPart = GeoPart | LinePart | StrokePart

interface IconTemplate {
  type: IconType
  label: string
  defaultColor?: TutorColor
  parts: IconPart[]
}

function absBox(
  x: number,
  y: number,
  w: number,
  h: number,
  part: { rx: number; ry: number; rw: number; rh: number }
) {
  return {
    x: Math.round(x + (part.rx / 100) * w),
    y: Math.round(y + (part.ry / 100) * h),
    w: Math.max(1, Math.round((part.rw / 100) * w)),
    h: Math.max(1, Math.round((part.rh / 100) * h)),
  }
}

function absPoint(x: number, y: number, w: number, h: number, point: { x: number; y: number }) {
  return {
    x: Math.round(x + (point.x / 100) * w),
    y: Math.round(y + (point.y / 100) * h),
  }
}

function partId(objectId: string, part: string) {
  return `${objectId}__${part}`
}

const ICON_TEMPLATES: Record<IconType, IconTemplate> = {
  woman: {
    type: 'woman',
    label: 'woman',
    defaultColor: 'violet',
    parts: [
      { kind: 'geo', part: 'hair', rx: 34, ry: 4, rw: 32, rh: 16, geo: 'cloud', color: 'violet', fill: 'solid' },
      { kind: 'geo', part: 'head', rx: 38, ry: 14, rw: 24, rh: 22, geo: 'ellipse', color: 'light-violet', fill: 'solid' },
      { kind: 'geo', part: 'neck', rx: 46, ry: 35, rw: 8, rh: 6, geo: 'rectangle', color: 'light-violet', fill: 'solid' },
      { kind: 'geo', part: 'torso', rx: 40, ry: 40, rw: 20, rh: 22, geo: 'rectangle', color: 'violet', fill: 'solid' },
      { kind: 'geo', part: 'skirt', rx: 30, ry: 60, rw: 40, rh: 32, geo: 'triangle', color: 'light-violet', fill: 'solid' },
      { kind: 'line', part: 'arm_left', x1: 40, y1: 44, x2: 22, y2: 58, color: 'violet' },
      { kind: 'line', part: 'arm_right', x1: 60, y1: 44, x2: 78, y2: 58, color: 'violet' },
      { kind: 'line', part: 'leg_left', x1: 42, y1: 92, x2: 42, y2: 100, color: 'violet' },
      { kind: 'line', part: 'leg_right', x1: 58, y1: 92, x2: 58, y2: 100, color: 'violet' },
    ],
  },
  person: {
    type: 'person',
    label: 'person',
    defaultColor: 'blue',
    parts: [
      { kind: 'geo', part: 'head', rx: 38, ry: 8, rw: 24, rh: 22, geo: 'ellipse', color: 'light-blue', fill: 'solid' },
      { kind: 'geo', part: 'torso', rx: 40, ry: 34, rw: 20, rh: 30, geo: 'rectangle', color: 'blue', fill: 'solid' },
      { kind: 'line', part: 'arm_left', x1: 40, y1: 38, x2: 20, y2: 56, color: 'blue' },
      { kind: 'line', part: 'arm_right', x1: 60, y1: 38, x2: 80, y2: 56, color: 'blue' },
      { kind: 'line', part: 'leg_left', x1: 44, y1: 64, x2: 40, y2: 96, color: 'blue' },
      { kind: 'line', part: 'leg_right', x1: 56, y1: 64, x2: 60, y2: 96, color: 'blue' },
    ],
  },
  man: {
    type: 'man',
    label: 'man',
    defaultColor: 'blue',
    parts: [
      { kind: 'geo', part: 'head', rx: 38, ry: 6, rw: 24, rh: 22, geo: 'ellipse', color: 'light-blue', fill: 'solid' },
      { kind: 'geo', part: 'torso', rx: 38, ry: 30, rw: 24, rh: 34, geo: 'rectangle', color: 'blue', fill: 'solid' },
      { kind: 'geo', part: 'pants', rx: 36, ry: 62, rw: 28, rh: 28, geo: 'rectangle', color: 'light-blue', fill: 'solid' },
      { kind: 'line', part: 'arm_left', x1: 38, y1: 34, x2: 18, y2: 54, color: 'blue' },
      { kind: 'line', part: 'arm_right', x1: 62, y1: 34, x2: 82, y2: 54, color: 'blue' },
      { kind: 'line', part: 'leg_left', x1: 42, y1: 90, x2: 42, y2: 100, color: 'blue' },
      { kind: 'line', part: 'leg_right', x1: 58, y1: 90, x2: 58, y2: 100, color: 'blue' },
    ],
  },
  car: {
    type: 'car',
    label: 'car',
    defaultColor: 'blue',
    parts: [
      { kind: 'geo', part: 'body', rx: 8, ry: 42, rw: 84, rh: 28, geo: 'rectangle', color: 'blue', fill: 'solid' },
      { kind: 'geo', part: 'cabin', rx: 48, ry: 24, rw: 34, rh: 22, geo: 'rectangle', color: 'light-blue', fill: 'solid' },
      { kind: 'geo', part: 'wheel_front', rx: 18, ry: 66, rw: 18, rh: 18, geo: 'ellipse', color: 'black', fill: 'solid' },
      { kind: 'geo', part: 'wheel_back', rx: 64, ry: 66, rw: 18, rh: 18, geo: 'ellipse', color: 'black', fill: 'solid' },
      { kind: 'geo', part: 'window', rx: 52, ry: 28, rw: 26, rh: 14, geo: 'rectangle', color: 'light-blue', fill: 'semi' },
    ],
  },
  vehicle: {
    type: 'vehicle',
    label: 'vehicle',
    defaultColor: 'blue',
    parts: [
      { kind: 'geo', part: 'cab', rx: 8, ry: 30, rw: 28, rh: 34, geo: 'rectangle', color: 'light-blue', fill: 'solid' },
      { kind: 'geo', part: 'cargo', rx: 34, ry: 38, rw: 56, rh: 26, geo: 'rectangle', color: 'blue', fill: 'solid' },
      { kind: 'geo', part: 'wheel_front', rx: 16, ry: 66, rw: 16, rh: 16, geo: 'ellipse', color: 'black', fill: 'solid' },
      { kind: 'geo', part: 'wheel_back', rx: 68, ry: 66, rw: 16, rh: 16, geo: 'ellipse', color: 'black', fill: 'solid' },
    ],
  },
  bicycle: {
    type: 'bicycle',
    label: 'bicycle',
    defaultColor: 'green',
    parts: [
      { kind: 'geo', part: 'wheel_front', rx: 58, ry: 52, rw: 34, rh: 34, geo: 'ellipse', color: 'green', fill: 'none' },
      { kind: 'geo', part: 'wheel_back', rx: 8, ry: 52, rw: 34, rh: 34, geo: 'ellipse', color: 'green', fill: 'none' },
      { kind: 'line', part: 'frame_top', x1: 25, y1: 52, x2: 58, y2: 30, color: 'green' },
      { kind: 'line', part: 'frame_down', x1: 25, y1: 52, x2: 58, y2: 52, color: 'green' },
      { kind: 'line', part: 'seat_post', x1: 34, y1: 52, x2: 38, y2: 28, color: 'green' },
      { kind: 'geo', part: 'seat', rx: 32, ry: 24, rw: 14, rh: 6, geo: 'rectangle', color: 'light-green', fill: 'solid' },
      { kind: 'line', part: 'handlebar', x1: 58, y1: 30, x2: 72, y2: 22, color: 'green' },
    ],
  },
  dog: {
    type: 'dog',
    label: 'dog',
    defaultColor: 'orange',
    parts: [
      { kind: 'geo', part: 'body', rx: 28, ry: 42, rw: 44, rh: 24, geo: 'ellipse', color: 'orange', fill: 'solid' },
      { kind: 'geo', part: 'head', rx: 62, ry: 34, rw: 22, rh: 20, geo: 'ellipse', color: 'light-red', fill: 'solid' },
      { kind: 'geo', part: 'ear', rx: 64, ry: 24, rw: 10, rh: 12, geo: 'triangle', color: 'orange', fill: 'solid' },
      { kind: 'geo', part: 'tail', rx: 16, ry: 38, rw: 14, rh: 8, geo: 'ellipse', color: 'orange', fill: 'solid' },
      { kind: 'line', part: 'leg_front', x1: 52, y1: 66, x2: 52, y2: 84, color: 'orange' },
      { kind: 'line', part: 'leg_back', x1: 36, y1: 66, x2: 36, y2: 84, color: 'orange' },
    ],
  },
  cat: {
    type: 'cat',
    label: 'cat',
    defaultColor: 'yellow',
    parts: [
      { kind: 'geo', part: 'body', rx: 30, ry: 46, rw: 40, rh: 22, geo: 'ellipse', color: 'yellow', fill: 'solid' },
      { kind: 'geo', part: 'head', rx: 58, ry: 36, rw: 20, rh: 18, geo: 'ellipse', color: 'orange', fill: 'solid' },
      { kind: 'geo', part: 'ear_left', rx: 58, ry: 24, rw: 8, rh: 10, geo: 'triangle', color: 'yellow', fill: 'solid' },
      { kind: 'geo', part: 'ear_right', rx: 68, ry: 24, rw: 8, rh: 10, geo: 'triangle', color: 'yellow', fill: 'solid' },
      { kind: 'stroke', part: 'tail', points: [{ x: 22, y: 50 }, { x: 8, y: 34 }, { x: 4, y: 22 }], color: 'yellow' },
      { kind: 'line', part: 'leg_front', x1: 54, y1: 68, x2: 54, y2: 84, color: 'yellow' },
      { kind: 'line', part: 'leg_back', x1: 40, y1: 68, x2: 40, y2: 84, color: 'yellow' },
    ],
  },
  tree: {
    type: 'tree',
    label: 'tree',
    defaultColor: 'green',
    parts: [
      { kind: 'geo', part: 'trunk', rx: 44, ry: 58, rw: 12, rh: 30, geo: 'rectangle', color: 'orange', fill: 'solid' },
      { kind: 'geo', part: 'foliage', rx: 24, ry: 12, rw: 52, rh: 48, geo: 'cloud', color: 'green', fill: 'solid' },
    ],
  },
  house: {
    type: 'house',
    label: 'house',
    defaultColor: 'red',
    parts: [
      { kind: 'geo', part: 'walls', rx: 22, ry: 44, rw: 56, rh: 40, geo: 'rectangle', color: 'light-red', fill: 'solid' },
      { kind: 'geo', part: 'roof', rx: 16, ry: 18, rw: 68, rh: 30, geo: 'triangle', color: 'red', fill: 'solid' },
      { kind: 'geo', part: 'door', rx: 44, ry: 62, rw: 12, rh: 22, geo: 'rectangle', color: 'orange', fill: 'solid' },
      { kind: 'geo', part: 'window', rx: 30, ry: 54, rw: 12, rh: 12, geo: 'rectangle', color: 'light-blue', fill: 'semi' },
    ],
  },
  flower: {
    type: 'flower',
    label: 'flower',
    defaultColor: 'violet',
    parts: [
      { kind: 'line', part: 'stem', x1: 50, y1: 54, x2: 50, y2: 96, color: 'green' },
      { kind: 'geo', part: 'petal_center', rx: 42, ry: 30, rw: 16, rh: 16, geo: 'ellipse', color: 'yellow', fill: 'solid' },
      { kind: 'geo', part: 'petal_top', rx: 44, ry: 12, rw: 12, rh: 16, geo: 'ellipse', color: 'violet', fill: 'solid' },
      { kind: 'geo', part: 'petal_left', rx: 24, ry: 28, rw: 12, rh: 16, geo: 'ellipse', color: 'light-violet', fill: 'solid' },
      { kind: 'geo', part: 'petal_right', rx: 64, ry: 28, rw: 12, rh: 16, geo: 'ellipse', color: 'light-violet', fill: 'solid' },
      { kind: 'geo', part: 'leaf', rx: 54, ry: 68, rw: 16, rh: 8, geo: 'ellipse', color: 'green', fill: 'solid' },
    ],
  },
  robot: {
    type: 'robot',
    label: 'robot',
    defaultColor: 'grey',
    parts: [
      { kind: 'geo', part: 'head', rx: 34, ry: 10, rw: 32, rh: 24, geo: 'rectangle', color: 'grey', fill: 'solid' },
      { kind: 'geo', part: 'eye_left', rx: 40, ry: 18, rw: 8, rh: 8, geo: 'ellipse', color: 'light-blue', fill: 'solid' },
      { kind: 'geo', part: 'eye_right', rx: 52, ry: 18, rw: 8, rh: 8, geo: 'ellipse', color: 'light-blue', fill: 'solid' },
      { kind: 'geo', part: 'body', rx: 30, ry: 38, rw: 40, rh: 34, geo: 'rectangle', color: 'light-violet', fill: 'solid' },
      { kind: 'line', part: 'arm_left', x1: 30, y1: 44, x2: 14, y2: 58, color: 'grey' },
      { kind: 'line', part: 'arm_right', x1: 70, y1: 44, x2: 86, y2: 58, color: 'grey' },
      { kind: 'geo', part: 'leg_left', rx: 36, ry: 74, rw: 10, rh: 20, geo: 'rectangle', color: 'grey', fill: 'solid' },
      { kind: 'geo', part: 'leg_right', rx: 54, ry: 74, rw: 10, rh: 20, geo: 'rectangle', color: 'grey', fill: 'solid' },
    ],
  },
}

export function getIconCatalogSummary(): string {
  return ICON_TYPES.map((type) => `${type} (${ICON_ALIASES[type].join(', ')})`).join('; ')
}

export function normalizeIconType(value: string): IconType | null {
  const normalized = value.trim().toLowerCase()
  if ((ICON_TYPES as readonly string[]).includes(normalized)) {
    return normalized as IconType
  }
  for (const type of ICON_TYPES) {
    if (ICON_ALIASES[type].includes(normalized)) {
      return type
    }
  }
  return null
}

export interface CreateIconParams {
  icon: IconType
  id: string
  x: number
  y: number
  w: number
  h: number
  color?: TutorColor
}

export function expandIconToActions(params: CreateIconParams): TutorAction[] {
  const template = ICON_TEMPLATES[params.icon]
  const palette = params.color ?? template.defaultColor ?? 'black'
  const childIds: string[] = []
  const actions: TutorAction[] = []

  for (const part of template.parts) {
    const id = partId(params.id, part.part)
    childIds.push(id)

    if (part.kind === 'geo') {
      const box = absBox(params.x, params.y, params.w, params.h, part)
      actions.push({
        type: 'create_shape',
        shape: 'geo',
        id,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        geo: part.geo,
        color: part.color ?? palette,
        fill: part.fill ?? 'solid',
      })
      continue
    }

    if (part.kind === 'line') {
      const start = absPoint(params.x, params.y, params.w, params.h, { x: part.x1, y: part.y1 })
      const end = absPoint(params.x, params.y, params.w, params.h, { x: part.x2, y: part.y2 })
      actions.push({
        type: 'create_line',
        id,
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        color: part.color ?? palette,
      })
      continue
    }

    const absolutePoints = part.points.map((point) =>
      absPoint(params.x, params.y, params.w, params.h, point)
    )
    const anchor = absolutePoints[0]
    actions.push({
      type: 'create_stroke',
      id,
      x: anchor.x,
      y: anchor.y,
      points: absolutePoints,
      color: part.color ?? palette,
      closed: part.closed,
      fill: part.fill,
      size: 'm',
    })
  }

  actions.push({
    type: 'group',
    id: params.id,
    childIds,
    label: template.label,
  })

  return actions
}
