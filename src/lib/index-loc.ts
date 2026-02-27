export function indexToLoc(source: string, index: number): { line: number; column: number } {
  let line = 1
  let pos = 0

  while (true) {
    const nl = source.indexOf('\n', pos)
    if (nl === -1 || nl >= index) break
    line++
    pos = nl + 1
  }

  return { line, column: index - pos + 1 }
}

const LINE_STARTS_CAP = 512

const lineStartsCache = new Map<string, number[]>()

function getLineStarts(source: string): number[] {
  let entry = lineStartsCache.get(source)
  if (entry) {
    lineStartsCache.delete(source)
    lineStartsCache.set(source, entry)
    return entry
  }
  const starts: number[] = [0]
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') starts.push(i + 1)
  }
  if (lineStartsCache.size >= LINE_STARTS_CAP) {
    lineStartsCache.delete(lineStartsCache.keys().next().value!)
  }
  lineStartsCache.set(source, starts)
  return starts
}

export function locToIndex(source: string, line: number, column: number): number {
  const starts = getLineStarts(source)
  if (line > starts.length) return source.length
  return starts[line - 1] + (column - 1)
}
