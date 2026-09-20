export const SELF_LOOP_START_ANCHOR = { x: 0.15, y: 0.85 }
export const SELF_LOOP_END_ANCHOR = { x: 0.85, y: 0.15 }

export interface PageBounds {
  x: number
  y: number
  w: number
  h: number
}

export function computeDefaultSelfLoopBend(width: number, height: number): number {
  return Math.round(Math.max(40, Math.min(width, height) * 0.75))
}

export function computeDefaultConnectorBend(distance: number): number {
  return Math.round(Math.min(80, Math.max(24, distance * 0.15)))
}

export function normalizedAnchorToward(
  bounds: PageBounds,
  target: { x: number; y: number }
): { x: number; y: number } {
  const centerX = bounds.x + bounds.w / 2
  const centerY = bounds.y + bounds.h / 2
  const dx = target.x - centerX
  const dy = target.y - centerY

  if (dx === 0 && dy === 0) {
    return { x: 0.5, y: 0.5 }
  }

  const halfW = bounds.w / 2
  const halfH = bounds.h / 2
  const scale = Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH, 0.0001)
  const edgeX = centerX + dx / scale
  const edgeY = centerY + dy / scale

  return {
    x: Math.min(1, Math.max(0, (edgeX - bounds.x) / bounds.w)),
    y: Math.min(1, Math.max(0, (edgeY - bounds.y) / bounds.h)),
  }
}

export function getConnectorBindingAnchors(startBounds: PageBounds, endBounds: PageBounds) {
  const startCenter = {
    x: startBounds.x + startBounds.w / 2,
    y: startBounds.y + startBounds.h / 2,
  }
  const endCenter = {
    x: endBounds.x + endBounds.w / 2,
    y: endBounds.y + endBounds.h / 2,
  }

  return {
    start: normalizedAnchorToward(startBounds, endCenter),
    end: normalizedAnchorToward(endBounds, startCenter),
  }
}

export function getArrowBindingAnchors(
  isSelfLoop: boolean,
  startBounds?: PageBounds,
  endBounds?: PageBounds
) {
  if (isSelfLoop) {
    return {
      start: SELF_LOOP_START_ANCHOR,
      end: SELF_LOOP_END_ANCHOR,
    }
  }

  if (startBounds && endBounds) {
    return getConnectorBindingAnchors(startBounds, endBounds)
  }

  return {
    start: { x: 0.5, y: 0.5 },
    end: { x: 0.5, y: 0.5 },
  }
}

export function resolveArrowBend(
  requestedBend: number | undefined,
  isSelfLoop: boolean,
  bounds?: { w: number; h: number },
  options?: { connectorDistance?: number }
): number {
  if (typeof requestedBend === 'number' && requestedBend !== 0) {
    return requestedBend
  }

  if (isSelfLoop && bounds) {
    return computeDefaultSelfLoopBend(bounds.w, bounds.h)
  }

  if (options?.connectorDistance) {
    return computeDefaultConnectorBend(options.connectorDistance)
  }

  return 0
}
