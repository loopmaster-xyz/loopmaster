import type { Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import { createHistoryReader, type DspLatency, type TramHistory, type TypedHistory, type UserCallHistory } from 'engine'
import { locToIndex } from '../lib/index-loc.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { impulse } from './util.ts'

export function createTramWidgets(tram: TramHistory, target: TypedHistory | UserCallHistory, doc: Doc,
  latency: Signal<DspLatency>, cache: Map<string, WidgetCacheEntry>): Widget[]
{
  if (!tram.beatMapping || tram.beatMapping.length === 0) {
    return []
  }

  const line = target.source.line
  const widgets: Widget[] = []
  const historyRef = { current: tram }

  const reader = createHistoryReader(
    tram.size,
    tram.mask,
    new Map<number, number>(),
    state => {
      state.clear()
    },
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index, sampleCount) => {
      state.set(historyRef.current.emit.fired.at(index), sampleCount)
    },
  )

  for (const beat of tram.beatMapping) {
    const startIndex = locToIndex(doc.code, line, beat.startCol)
    const endIndex = locToIndex(doc.code, line, beat.endCol)
    const key = makeWidgetCacheKey('Tram', startIndex, endIndex, beat.linearIndex)
    const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: TramHistory } } | undefined
    if (cached?.doc === doc) {
      cached.historyRef.current = tram
      cached.widget.pos = { x: [beat.startCol, beat.endCol], y: line }
      widgets.push(cached.widget)
      continue
    }
    cache.delete(key)

    let firedAt = beat.linearIndex === 0 ? 0 : -Infinity
    let elapsed = Infinity
    let epoch = -1
    const draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      reader.run(++epoch)
      if (reader.now < firedAt) {
        firedAt = beat.linearIndex === 0 ? 0 : -Infinity
      }
      if (reader.state.has(beat.linearIndex)) {
        firedAt = reader.state.get(beat.linearIndex)!
      }
      elapsed = reader.now - firedAt
      const opacity = Math.max(0, 1 - elapsed / latency.value.state.sampleRate)
      impulse(c, opacity, x, y, w, h)
    }

    const widget: Widget = {
      type: 'overlay',
      pos: { x: [beat.startCol, beat.endCol], y: line },
      draw,
    }
    cache.set(key, { doc, widget, historyRef })
    widgets.push(widget)
  }

  return widgets
}
