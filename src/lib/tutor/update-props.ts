import { toRichText, type TLDefaultColorStyle, type TLDefaultFillStyle, type TLShapeId } from 'tldraw'

export interface ShapeUpdateInput {
  x?: number
  y?: number
  w?: number
  h?: number
  text?: string
  color?: TLDefaultColorStyle
  fill?: TLDefaultFillStyle
  bend?: number
}

function compactProps<T extends Record<string, unknown>>(props: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined)
  ) as Partial<T>
}

export function buildGeoShapeUpdate(
  shape: { id: TLShapeId; x: number; y: number },
  props: ShapeUpdateInput
) {
  const shapeProps = compactProps({
    w: props.w,
    h: props.h,
    color: props.color,
    labelColor: props.color,
    fill: props.fill,
    align: props.text !== undefined ? ('middle' as const) : undefined,
    verticalAlign: props.text !== undefined ? ('middle' as const) : undefined,
    richText: props.text !== undefined ? toRichText(props.text) : undefined,
  })

  const update = {
    id: shape.id,
    type: 'geo' as const,
    x: props.x ?? shape.x,
    y: props.y ?? shape.y,
    ...(Object.keys(shapeProps).length > 0 ? { props: shapeProps } : {}),
  }

  return update
}

export function buildTextShapeUpdate(
  shape: { id: TLShapeId; x: number; y: number },
  props: ShapeUpdateInput
) {
  const shapeProps = compactProps({
    color: props.color,
    richText: props.text !== undefined ? toRichText(props.text) : undefined,
    textAlign: props.text !== undefined ? ('middle' as const) : undefined,
  })

  const update = {
    id: shape.id,
    type: 'text' as const,
    x: props.x ?? shape.x,
    y: props.y ?? shape.y,
    ...(Object.keys(shapeProps).length > 0 ? { props: shapeProps } : {}),
  }

  return update
}

export function buildArrowShapeUpdate(
  shape: { id: TLShapeId; x: number; y: number },
  props: ShapeUpdateInput
) {
  const shapeProps = compactProps({
    color: props.color,
    bend: props.bend,
    richText: props.text !== undefined ? toRichText(props.text) : undefined,
    labelPosition: props.text !== undefined ? 0.5 : undefined,
    labelColor: props.color,
  })

  const update = {
    id: shape.id,
    type: 'arrow' as const,
    x: props.x ?? shape.x,
    y: props.y ?? shape.y,
    ...(Object.keys(shapeProps).length > 0 ? { props: shapeProps } : {}),
  }

  return update
}

export function buildGenericShapeUpdate(
  shape: { id: TLShapeId; type: string; x: number; y: number },
  props: ShapeUpdateInput
) {
  return {
    id: shape.id,
    type: shape.type,
    x: props.x ?? shape.x,
    y: props.y ?? shape.y,
  }
}
