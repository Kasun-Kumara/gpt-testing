export const ICON_TYPES = [
  'woman',
  'person',
  'man',
  'car',
  'vehicle',
  'bicycle',
  'dog',
  'cat',
  'tree',
  'house',
  'flower',
  'robot',
] as const

export type IconType = (typeof ICON_TYPES)[number]
