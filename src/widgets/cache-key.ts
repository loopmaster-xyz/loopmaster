const PREFIX = 'wk'

export type WidgetCacheKeyParsed = {
  kind: string
  start: number
  end: number
  extra: string[]
}

export function makeWidgetCacheKey(
  kind: string,
  start: number,
  end: number,
  ...extra: Array<string | number | boolean | null | undefined>
): string {
  if (kind.includes(':')) {
    throw new Error(`Widget cache key kind must not contain ":" (got ${JSON.stringify(kind)})`)
  }
  const parts: string[] = [PREFIX, kind, String(start), String(end)]
  for (const item of extra) {
    if (item === null || item === undefined) continue
    const s = String(item)
    if (s.includes(':')) {
      throw new Error(`Widget cache key extra must not contain ":" (got ${JSON.stringify(s)})`)
    }
    parts.push(s)
  }
  return parts.join(':')
}

export function parseWidgetCacheKey(key: string): WidgetCacheKeyParsed | null {
  const parts = key.split(':')
  if (parts[0] !== PREFIX) return null
  const kind = parts[1]
  const start = Number(parts[2])
  const end = Number(parts[3])
  if (!kind || !Number.isFinite(start) || !Number.isFinite(end)) return null
  return { kind, start, end, extra: parts.slice(4) }
}

export function relocateWidgetCacheKeys(
  cache: Map<string, unknown>,
  spliceStart: number,
  deletedLen: number,
  insertedLen: number,
): void {
  if (deletedLen === 0 && insertedLen === 0) return

  const prefixWithColon = PREFIX + ':'
  const kindStart = prefixWithColon.length
  const spliceEnd = spliceStart + deletedLen
  const delta = insertedLen - deletedLen

  const moves: Array<[from: string, to: string, value: unknown]> = []
  for (const [key, value] of cache) {
    if (!key.startsWith(prefixWithColon)) continue

    const kindEnd = key.indexOf(':', kindStart)
    if (kindEnd === -1) continue

    const startStart = kindEnd + 1
    const startEnd = key.indexOf(':', startStart)
    if (startEnd === -1) continue

    const endStart = startEnd + 1
    const maybeEndEnd = key.indexOf(':', endStart)
    const endEnd = maybeEndEnd === -1 ? key.length : maybeEndEnd
    const tail = maybeEndEnd === -1 ? '' : key.slice(maybeEndEnd)

    const kind = key.slice(kindStart, kindEnd)
    if (!kind) continue

    const startStr = key.slice(startStart, startEnd)
    const endStr = key.slice(endStart, endEnd)
    const start = Number(startStr)
    const end = Number(endStr)
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue

    let nextStart = start
    if (start < spliceStart) {
    }
    else if (start > spliceEnd) {
      nextStart = start + delta
    }
    else {
      nextStart = spliceStart
    }

    let nextEnd = end
    if (end < spliceStart) {
    }
    else if (end > spliceEnd) {
      nextEnd = end + delta
    }
    else {
      nextEnd = spliceStart + insertedLen
    }

    nextStart = Math.max(0, nextStart)
    nextEnd = Math.max(0, nextEnd)

    const nextStartStr = String(nextStart)
    const nextEndStr = String(nextEnd)
    if (nextStartStr === startStr && nextEndStr === endStr) continue

    const nextKey = prefixWithColon + kind + ':' + nextStartStr + ':' + nextEndStr + tail
    if (value === undefined) continue
    moves.push([key, nextKey, value])
  }

  for (const [from, to, value] of moves) {
    cache.delete(from)
    cache.set(to, value)
  }
}
