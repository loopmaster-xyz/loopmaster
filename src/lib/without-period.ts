export function withoutPeriod(s: string): string {
  return s.trimEnd().replace(/[.!?]$/, '')
}
