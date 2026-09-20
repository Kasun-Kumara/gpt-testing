import type { Editor, TLShape, TLShapeId } from 'tldraw'
import type { ShapeMeta } from '@/types/tutor'

export function getShapeMeta(shape: TLShape): ShapeMeta {
  return (shape.meta ?? {}) as ShapeMeta
}

export function findShapeBySemanticId(editor: Editor, semanticId: string): TLShape | undefined {
  return editor.getCurrentPageShapes().find((shape) => getShapeMeta(shape).semanticId === semanticId)
}

export function findTldrawIdBySemanticId(editor: Editor, semanticId: string): TLShapeId | undefined {
  return findShapeBySemanticId(editor, semanticId)?.id
}

export function isIconPartSemanticId(semanticId: string): boolean {
  return semanticId.includes('__')
}

export function getIconGroupSemanticId(semanticId: string): string | undefined {
  if (!isIconPartSemanticId(semanticId)) {
    return undefined
  }
  return semanticId.split('__')[0]
}

export function resolveConnectableShapeId(editor: Editor, semanticId: string): TLShapeId | undefined {
  const groupSemanticId = getIconGroupSemanticId(semanticId)
  if (groupSemanticId) {
    const groupShapeId = findTldrawIdBySemanticId(editor, groupSemanticId)
    if (groupShapeId) {
      return groupShapeId
    }
  }

  const shape = findShapeBySemanticId(editor, semanticId)
  if (!shape) {
    return undefined
  }

  const parent = editor.getShapeParent(shape.id)
  if (parent?.type === 'group') {
    const parentSemanticId = getShapeMeta(parent).semanticId
    if (parentSemanticId) {
      return parent.id
    }
  }

  return shape.id
}

export function getAiShapes(editor: Editor): TLShape[] {
  return editor.getCurrentPageShapes().filter((shape) => getShapeMeta(shape).createdBy === 'ai')
}

export function getSemanticSelection(editor: Editor): string[] {
  return editor
    .getSelectedShapes()
    .map((shape) => getShapeMeta(shape).semanticId)
    .filter((id): id is string => Boolean(id))
}

export function getNextSemanticId(editor: Editor, prefix: string): string {
  const existing = new Set(
    editor
      .getCurrentPageShapes()
      .map((shape) => getShapeMeta(shape).semanticId)
      .filter((id): id is string => Boolean(id))
  )

  let index = 1
  while (existing.has(`${prefix}_${index}`)) {
    index += 1
  }

  return `${prefix}_${index}`
}

export function inferLabelFromSemanticId(semanticId: string): string {
  return semanticId.replace(/_\d+$/, '').replace(/_/g, ' ')
}

export interface MockShape {
  id: string
  meta?: ShapeMeta
}

export function findMockShapeBySemanticId(shapes: MockShape[], semanticId: string): MockShape | undefined {
  return shapes.find((shape) => shape.meta?.semanticId === semanticId)
}

export function getSemanticIdForShape(editor: Editor, shapeId: TLShapeId): string | undefined {
  const shape = editor.getShape(shapeId)
  if (!shape) return undefined
  return getShapeMeta(shape).semanticId
}

export function getArrowEndpointSemanticIds(
  editor: Editor,
  arrowId: TLShapeId
): { fromId?: string; toId?: string } {
  const bindings = editor.getBindingsFromShape(arrowId, 'arrow')
  const endpoints: { fromId?: string; toId?: string } = {}

  for (const binding of bindings) {
    const semanticId = getSemanticIdForShape(editor, binding.toId)
    if (!semanticId) continue

    if (binding.props.terminal === 'start') {
      endpoints.fromId = semanticId
    }
    if (binding.props.terminal === 'end') {
      endpoints.toId = semanticId
    }
  }

  return endpoints
}
