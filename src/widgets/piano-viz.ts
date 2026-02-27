import { primaryColor, primaryDarkColor, theme } from '../state.ts'

export const BLACK_KEY_STEPS = new Set([1, 3, 6, 8, 10])
const PADDING_SEMITONES = 2
const MIN_RANGE = 16

export function isBlackKey(midi: number): boolean {
  return BLACK_KEY_STEPS.has(((midi % 12) + 12) % 12)
}

export function countWhiteKeys(low: number, high: number): number {
  let n = 0
  for (let m = low; m <= high; m++) {
    if (!isBlackKey(m)) n++
  }
  return n
}

function isCurrent(midi: number, current: Set<number> | number): boolean {
  return typeof current === 'number' ? midi === current : current.has(midi)
}

export function computePianoRange(
  minNote: number | null,
  maxNote: number | null,
  currentNote: number,
): { low: number; high: number } {
  if (minNote === null || maxNote === null) {
    const center = currentNote
    const span = MIN_RANGE + PADDING_SEMITONES * 2
    const low = Math.round(center - span / 2)
    return { low, high: low + span - 1 }
  }
  const span = Math.max(MIN_RANGE, (maxNote - minNote) + 1 + PADDING_SEMITONES * 2)
  const center = (minNote + maxNote) / 2
  const low = Math.round(center - span / 2)
  return { low, high: low + span - 1 }
}

export function drawPianoViz(
  c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  low: number,
  high: number,
  currentNotes: Set<number> | number,
): void {
  const whiteCount = countWhiteKeys(low, high)
  const whiteW = w / whiteCount
  const blackW = whiteW * 0.5
  const blackH = h * 0.6

  c.save()
  c.translate(x, y)
  c.rect(0, 0, w, h)
  c.clip()

  for (let midi = low; midi <= high; midi++) {
    if (isBlackKey(midi)) continue
    const idx = countWhiteKeys(low, midi) - 1
    const keyX = idx * whiteW
    c.fillStyle = isCurrent(midi, currentNotes) ? primaryColor.value : primaryDarkColor.value
    c.fillRect(keyX, 0, whiteW, h)
  }

  const leftBoundaryBlack = low - 1
  if (isBlackKey(leftBoundaryBlack)) {
    const keyX = -blackW / 2
    c.fillStyle = isCurrent(leftBoundaryBlack, currentNotes) ? primaryColor.value : theme.value.black
    c.fillRect(keyX, 0, blackW, blackH)
  }
  for (let midi = low; midi <= high; midi++) {
    if (!isBlackKey(midi)) continue
    const boundary = countWhiteKeys(low, midi) * whiteW
    const keyX = boundary - blackW / 2
    c.fillStyle = isCurrent(midi, currentNotes) ? primaryColor.value : theme.value.black + 'bb'
    c.fillRect(keyX, 0, blackW, blackH)
  }
  const boundaryBlack = high + 1
  if (isBlackKey(boundaryBlack)) {
    const boundary = whiteCount * whiteW
    const keyX = boundary - blackW / 2
    c.fillStyle = isCurrent(boundaryBlack, currentNotes) ? primaryColor.value : theme.value.black
    c.fillRect(keyX, 0, blackW, blackH)
  }

  c.fillStyle = theme.value.black + 'bb'
  c.font = 'bold 6px "Outfit"'
  c.textAlign = 'center'
  c.textBaseline = 'bottom'
  for (let midi = low; midi <= high; midi++) {
    if (isBlackKey(midi) || midi % 12 !== 0) continue
    const idx = countWhiteKeys(low, midi) - 1
    const keyCenterX = (idx + 0.5) * whiteW
    c.fillText(String(Math.floor(midi / 12) - 1), keyCenterX, h)
  }

  c.restore()
}
