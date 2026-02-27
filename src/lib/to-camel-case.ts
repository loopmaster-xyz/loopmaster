export function toCamelCase(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1).replace(/-(.)/g, (_, c) => c.toUpperCase())
}
