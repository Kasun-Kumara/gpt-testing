import { TUTOR_COLORS, TUTOR_FILLS, type TutorAction } from '@/lib/tutor/actions'

export type TutorColor = (typeof TUTOR_COLORS)[number]
export type TutorFill = (typeof TUTOR_FILLS)[number]

export interface FillColorIntent {
  color: TutorColor
  fill: TutorFill
}

const SORTED_COLORS = [...TUTOR_COLORS].sort((a, b) => b.length - a.length)

const FILL_INTENT_PATTERN =
  /\b(fill(?:ed|ing)?|filled\s+with|with\s+(?:a\s+)?(?:solid|semi|pattern)\s+fill)\b/i

function colorPattern(color: TutorColor): RegExp {
  const escaped = color.replace(/-/g, '[\\s-]')
  return new RegExp(`\\b${escaped}\\b`, 'i')
}

export function parseColorFromMessage(message: string): TutorColor | null {
  for (const candidate of SORTED_COLORS) {
    if (colorPattern(candidate).test(message)) {
      return candidate
    }
  }
  return null
}

export function parseFillStyleFromMessage(message: string): TutorFill | null {
  const normalized = message.toLowerCase()

  if (/\b(no fill|without fill|outline only|hollow|unfilled|fill:\s*none)\b/.test(normalized)) {
    return 'none'
  }
  if (/\b(semi(?:[\s-]transparent)?|translucent|half[\s-]transparent)\b/.test(normalized)) {
    return 'semi'
  }
  if (/\b(pattern|hatched|striped)\b/.test(normalized)) {
    return 'pattern'
  }
  if (/\b(solid fill|filled solid|solid)\b/.test(normalized)) {
    return 'solid'
  }

  return null
}

export function parseFillColorIntent(message: string): FillColorIntent | null {
  if (!FILL_INTENT_PATTERN.test(message)) {
    return null
  }

  const color = parseColorFromMessage(message)
  if (!color) {
    return null
  }

  return {
    color,
    fill: parseFillStyleFromMessage(message) ?? 'solid',
  }
}

function applyIntentToGeoStyle<T extends { color?: TutorColor; fill?: TutorFill }>(
  props: T,
  intent: FillColorIntent
): T {
  return {
    ...props,
    color: intent.color,
    fill: props.fill === 'none' || props.fill === undefined ? intent.fill : props.fill,
  }
}

export function applyFillColorIntent(message: string, actions: TutorAction[]): TutorAction[] {
  const intent = parseFillColorIntent(message)
  if (!intent) {
    return actions
  }

  return actions.map((action) => {
    if (action.type === 'create_shape' && action.shape === 'geo') {
      return {
        ...action,
        ...applyIntentToGeoStyle(
          {
            color: action.color,
            fill: action.fill,
          },
          intent
        ),
      }
    }

    if (action.type === 'update') {
      const props = action.props
      const hasStyle = props.color !== undefined || props.fill !== undefined
      const hasGeometryOrText =
        props.x !== undefined ||
        props.y !== undefined ||
        props.w !== undefined ||
        props.h !== undefined ||
        props.text !== undefined

      if (!hasStyle && hasGeometryOrText) {
        return action
      }

      return {
        ...action,
        props: applyIntentToGeoStyle(props, intent),
      }
    }

    return action
  })
}
