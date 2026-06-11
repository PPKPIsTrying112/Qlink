export function parseBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.split('Bearer ')[1] || null
}