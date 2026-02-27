export function withPeriod(s: string): string {
  const t = s.trimEnd()
  if (!t || /[.!?]$/.test(t)) return s
  return t + '.'
}
