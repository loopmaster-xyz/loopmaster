import type { Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import {
  type ArrayGetHistory,
  createHistoryReader,
  type DspLatency,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { locToIndex } from '../lib/index-loc.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { impulse } from './util.ts'

type ArrayGetWithMapping = ArrayGetHistory & {
  elementMapping?: Array<{ index: number; startCol: number; endCol: number }>
}

export function createArrayGetWidgets(
  history: ArrayGetWithMapping,
  target: TypedHistory | UserCallHistory,
  doc: Doc,
  latency: Signal<DspLatency>,
  cache: Map<string, WidgetCacheEntry>,
): Widget[] {
  const mapping = history.elementMapping
  if (!mapping || mapping.length === 0) {
    return []
  }

  const line = target.source.line
  const widgets: Widget[] = []
  const historyRef = { current: history }

  const reader = createHistoryReader(
    history.size,
    history.mask,
    new Map<number, number>(),
    state => {
      state.clear()
    },
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index, sampleCount) => {
      state.set(Math.round(historyRef.current.params.index.at(index)), sampleCount)
    },
  )

  for (const el of mapping) {
    const startIndex = locToIndex(doc.code, line, el.startCol)
    const endIndex = locToIndex(doc.code, line, el.endCol)
    const key = makeWidgetCacheKey('ArrayGet', startIndex, endIndex)
    const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: ArrayGetWithMapping } }
      | undefined
    if (cached?.doc === doc) {
      cached.historyRef.current = history
      cached.widget.pos = { x: [el.startCol, el.endCol], y: line }
      widgets.push(cached.widget)
      continue
    }
    cache.delete(key)

    let firedAt = el.index === 0 ? 0 : -Infinity
    let elapsed = Infinity
    let epoch = -1
    const draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      reader.run(++epoch)
      if (reader.now < firedAt) {
        firedAt = el.index === 0 ? 0 : -Infinity
      }
      if (reader.state.has(el.index)) {
        firedAt = reader.state.get(el.index)!
      }
      elapsed = reader.now - firedAt
      const opacity = Math.max(0, 1 - elapsed / latency.value.state.sampleRate)
      impulse(c, opacity, x, y, w, h)
    }

    const widget: Widget = {
      type: 'overlay',
      pos: { x: [el.startCol, el.endCol], y: line },
      draw,
    }
    cache.set(key, { doc, widget, historyRef })
    widgets.push(widget)
  }

  return widgets
}
