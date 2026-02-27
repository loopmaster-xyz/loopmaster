import { primaryMediumColor } from '../state.ts'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

export function clamp11(value: number): number {
  return clamp(value, -1, 1)
}

export function applyCurve(t: number, curve: number): number {
  if (curve > 0.0) return Math.pow(t, curve)
  if (curve < 0.0) {
    const base = -curve
    // mirrored complement: make e-<n> be the exact opposite of e< n >
    // so e-10(t) == 1 - (1 - t)^10
    if (base > 0.0) {
      return 1.0 - Math.pow(1.0 - t, base)
    }
  }
  return t
}

export function getFunctionCallLength(source: string, line: number, column: number): number {
  const lines = source.split('\n')
  if (line < 1 || line > lines.length) return 0

  let pos = 0
  for (let i = 0; i < line - 1; i++) {
    pos += lines[i]!.length + 1
  }
  pos += column - 1

  if (pos >= source.length) return 0

  let i = pos
  let parenDepth = 0
  let inSingleComment = false
  let inMultiComment = false
  let inString = false
  let stringChar = ''
  let escaped = false
  let startCol = column
  let col = column
  let maxCol = column
  let hasNewlines = false

  while (i < source.length && source[i] !== '(') {
    const ch = source[i]!
    if (ch === '\n') {
      col = 1
      hasNewlines = true
    }
    else {
      col++
    }
    if (col > maxCol) maxCol = col
    i++
  }

  if (i >= source.length || source[i] !== '(') return 0

  i++
  parenDepth = 1
  col++
  if (col > maxCol) maxCol = col

  while (i < source.length && parenDepth > 0) {
    const ch = source[i]!
    const next = i + 1 < source.length ? source[i + 1] : ''

    if (escaped) {
      escaped = false
      i++
      if (ch === '\n') {
        col = 1
        hasNewlines = true
      }
      else {
        col++
      }
      if (col > maxCol) maxCol = col
      continue
    }

    if (inString) {
      if (ch === '\\') {
        escaped = true
        i++
        col++
        if (col > maxCol) maxCol = col
        continue
      }
      if (ch === stringChar) {
        inString = false
        stringChar = ''
      }
      i++
      if (ch === '\n') {
        col = 1
        hasNewlines = true
      }
      else {
        col++
      }
      if (col > maxCol) maxCol = col
      continue
    }

    if (inSingleComment) {
      if (ch === '\n') {
        inSingleComment = false
        col = 1
        hasNewlines = true
      }
      else {
        col++
      }
      if (col > maxCol) maxCol = col
      i++
      continue
    }

    if (inMultiComment) {
      if (ch === '*' && next === '/') {
        inMultiComment = false
        i += 2
        col += 2
        if (col > maxCol) maxCol = col
        continue
      }
      if (ch === '\n') {
        col = 1
        hasNewlines = true
      }
      else {
        col++
      }
      if (col > maxCol) maxCol = col
      i++
      continue
    }

    if (ch === '/' && next === '/') {
      inSingleComment = true
      i += 2
      col += 2
      if (col > maxCol) maxCol = col
      continue
    }

    if (ch === '/' && next === '*') {
      inMultiComment = true
      i += 2
      col += 2
      if (col > maxCol) maxCol = col
      continue
    }

    if (ch === '"' || ch === '\'' || ch === '`') {
      inString = true
      stringChar = ch
      i++
      col++
      if (col > maxCol) maxCol = col
      continue
    }

    if (ch === '(') {
      parenDepth++
      i++
      col++
      if (col > maxCol) maxCol = col
      continue
    }

    if (ch === ')') {
      parenDepth--
      i++
      col++
      if (col > maxCol) maxCol = col
      if (parenDepth === 0) {
        break
      }
      continue
    }

    if (ch === '\n') {
      col = 1
      hasNewlines = true
    }
    else {
      col++
    }
    if (col > maxCol) maxCol = col
    i++
  }

  if (hasNewlines) {
    return maxCol - startCol
  }
  else {
    return i - pos
  }
}

export function impulse(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, a: number, x: number,
  y: number, w: number, h: number): void
{
  if (a > 0) {
    c.globalAlpha = a ** 4
    c.fillStyle = primaryMediumColor.value
    c.fillRect(x, y, w, h - 1)
    c.globalAlpha = 1
  }
}
