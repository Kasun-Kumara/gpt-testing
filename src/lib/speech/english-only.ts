const ENGLISH_CHAR_PATTERN = /[A-Za-z0-9_\s.,!?'":;()\-&/]/g

export function filterEnglishTranscript(text: string): string {
  const parts = text.match(ENGLISH_CHAR_PATTERN)
  return parts ? parts.join('') : ''
}

export function normalizeEnglishCommand(text: string): string {
  return filterEnglishTranscript(text).replace(/\s+/g, ' ').trim()
}

export function hasEnglishContent(text: string): boolean {
  return /[A-Za-z]/.test(text)
}
