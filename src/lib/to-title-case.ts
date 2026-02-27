export function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/-(.)/g, (_, c) => '-' + c.toUpperCase())
}
