export function parseModerationResult(text: string): { safe: boolean; reason: string } {
  const t = (text || '').trim()
  if (t.toUpperCase().startsWith('UNSAFE')) {
    return { safe: false, reason: t.replace(/^UNSAFE:?\s*/i, '') }
  }
  return { safe: true, reason: '' }
}