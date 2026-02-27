export function safeJsonParse<T>(json: string | null | undefined): T | null {
  if (json == null) return null
  try {
    return JSON.parse(json)
  }
  catch (error) {
    return null
  }
}
