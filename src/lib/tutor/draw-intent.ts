const BOARD_ACTION_PATTERNS = [
  /\bdraw\b/i,
  /\bsketch\b/i,
  /\billustrat(?:e|ion)\b/i,
  /\bdiagram\b/i,
  /\bflowchart\b/i,
  /\bon the (?:board|whiteboard|canvas)\b/i,
  /\b(?:to|on|onto) the (?:board|whiteboard|canvas)\b/i,
  /\bput (?:it )?on the (?:board|whiteboard|canvas)\b/i,
  /\bshow (?:me )?(?:on|on the) (?:board|whiteboard|canvas)\b/i,
  /\bwrite (?:on|to) the (?:board|whiteboard|canvas)\b/i,
  /\bclear (?:the )?(?:board|whiteboard|canvas|ai shapes?)\b/i,
  /\bconnect\b.+\b(?:with|to)\b/i,
  /\bhighlight\b/i,
  /\blaser\b/i,
  /\b(?:move|recolor|delete|remove|erase|update|change|fill|make)\b.+\b(?:shape|circle|rectangle|square|arrow|line|box|icon|object)\b/i,
  /\b(?:shape|circle|rectangle|square|arrow|line|box|icon|object)\b.+\b(?:move|recolor|delete|remove|erase|update|change|fill|make|green|blue|red|yellow|orange|violet|black|white)\b/i,
  /\badd (?:a|an|the) (?:arrow|line|circle|rectangle|square|shape|text|label)\b/i,
  /\bcreate (?:a|an|the) (?:arrow|line|circle|rectangle|square|shape|text|label|diagram)\b/i,
  /\bmake (?:a|an|the) (?:arrow|line|circle|rectangle|square|shape)\b/i,
  /\blabel (?:the|this|that)\b/i,
  /\bgroup (?:the|these|those)\b/i,
  /\bfocus (?:on|the)\b/i,
]

export function hasDrawingIntent(message: string): boolean {
  const normalized = message.trim()
  if (!normalized) {
    return false
  }

  return BOARD_ACTION_PATTERNS.some((pattern) => pattern.test(normalized))
}
