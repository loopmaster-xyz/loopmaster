export function cn(...inputs: unknown[]): string {
  return inputs
    .flat(Infinity)
    .map(input => {
      if (!input) return ''
      if (typeof input === 'string' || typeof input === 'number') return input
      if (Array.isArray(input)) return cn(...input)
      if (typeof input === 'object') {
        return Object.entries(input)
          .filter(([_, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ')
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
}
