export function toPascalCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
