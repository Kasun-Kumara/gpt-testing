import type { TutorAction } from '@/lib/tutor/actions'
import { ICON_ALIASES, ICON_TYPES } from '@/lib/tutor/icons'
import { isIconPartSemanticId } from '@/lib/tutor/selectors'
import type { CanvasObjectSummary, TutorCanvasContext } from '@/types/tutor'

const CONNECT_PATTERN =
  /\bconnect(?:ed|ing)?\s+(?:the\s+)?(.+?)\s+(?:with|to)\s+(?:the\s+)?(.+?)(?:\s+with\b|\s+using\b|[.!?]|$)/i

function cleanTerm(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/\s+with\s+an?\s+arrow.*$/i, '')
    .replace(/\s+using\s+an?\s+arrow.*$/i, '')
    .trim()
}

export function getConnectableObjects(context: TutorCanvasContext): CanvasObjectSummary[] {
  return context.objects.filter((object) => !isIconPartSemanticId(object.id))
}

export function resolveConnectableObjectId(
  context: TutorCanvasContext,
  term: string
): string | null {
  const cleaned = cleanTerm(term)
  if (!cleaned) {
    return null
  }

  const connectable = getConnectableObjects(context)

  const exact = connectable.find((object) => object.id.toLowerCase() === cleaned)
  if (exact) {
    return exact.id
  }

  const prefixed = connectable.find((object) => {
    const base = object.id.replace(/_\d+$/, '')
    return base === cleaned || object.id.toLowerCase().startsWith(`${cleaned}_`)
  })
  if (prefixed) {
    return prefixed.id
  }

  const byLabel = connectable.find((object) => object.label?.toLowerCase() === cleaned)
  if (byLabel) {
    return byLabel.id
  }

  for (const iconType of ICON_TYPES) {
    const aliases = ICON_ALIASES[iconType]
    const matchesAlias = aliases.some(
      (alias) => cleaned === alias || cleaned.includes(alias) || alias.includes(cleaned)
    )
    if (!matchesAlias) {
      continue
    }

    const match = connectable.find((object) => {
      const base = object.id.replace(/_\d+$/, '')
      return base === iconType
    })
    if (match) {
      return match.id
    }

    if (iconType === 'vehicle') {
      const vehicleMatch = connectable.find((object) => {
        const base = object.id.replace(/_\d+$/, '')
        return base === 'vehicle' || base === 'car'
      })
      if (vehicleMatch) {
        return vehicleMatch.id
      }
    }
  }

  return null
}

export function parseConnectIntent(message: string): { fromTerm: string; toTerm: string } | null {
  const match = message.match(CONNECT_PATTERN)
  if (!match) {
    return null
  }

  return {
    fromTerm: match[1],
    toTerm: match[2],
  }
}

export function applyConnectIntent(
  message: string,
  context: TutorCanvasContext,
  actions: TutorAction[]
): TutorAction[] {
  const connectIntent = parseConnectIntent(message)
  if (!connectIntent) {
    return actions
  }

  const fromId = resolveConnectableObjectId(context, connectIntent.fromTerm)
  const toId = resolveConnectableObjectId(context, connectIntent.toTerm)
  if (!fromId || !toId || fromId === toId) {
    return actions
  }

  let updated = false

  const nextActions = actions.map((action) => {
    if (action.type !== 'create_arrow') {
      return action
    }

    const shouldRewrite =
      action.fromId === action.toId ||
      isIconPartSemanticId(action.fromId) ||
      isIconPartSemanticId(action.toId) ||
      action.fromId === toId ||
      action.toId === fromId

    if (!shouldRewrite) {
      return action
    }

    updated = true
    const wasBrokenSelfLoop =
      action.fromId === action.toId ||
      isIconPartSemanticId(action.fromId) ||
      isIconPartSemanticId(action.toId)

    return {
      ...action,
      fromId,
      toId,
      bend: wasBrokenSelfLoop ? undefined : action.bend,
    }
  })

  if (updated) {
    return nextActions
  }

  const hasArrow = actions.some((action) => action.type === 'create_arrow')
  if (!hasArrow) {
    return [
      ...actions,
      {
        type: 'create_arrow',
        id: context.suggestedIds?.arrow ?? 'arrow_1',
        fromId,
        toId,
      },
    ]
  }

  return nextActions
}
