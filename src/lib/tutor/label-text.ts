export function resolveVisibleLabelText(action: {
  text?: string
  label?: string
}): string | undefined {
  const text = action.text?.trim()
  if (text) {
    return text
  }

  const label = action.label?.trim()
  if (label) {
    return label
  }

  return undefined
}
