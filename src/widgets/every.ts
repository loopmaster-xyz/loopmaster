import type { Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import {
  createHistoryReader,
  type DspLatency,
  type EveryHistory,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { locToIndex } from '../lib/index-loc.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { getFunctionCallLength, impulse } from './util.ts'

export function createEveryWidget(
  every: EveryHistory,
  target: TypedHistory | UserCallHistory,
  doc: Doc,
  latency: Signal<DspLatency>,
  cache: Map<string, WidgetCacheEntry>,
): Widget {
  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const line = target.source.line

  const startIndex = locToIndex(doc.code, line, startCol)
  const endIndex = locToIndex(doc.code, line, endCol)
  const key = makeWidgetCacheKey('Every', startIndex, endIndex)
  const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: EveryHistory } } | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = every
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  cache.delete(key)

  const historyRef = { current: every }
  const reader = createHistoryReader(
    every.size,
    every.mask,
    {
      firedAt: -Infinity,
    },
    state => {
      state.firedAt = -Infinity
    },
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index, sampleCount) => {
      if (historyRef.current.emit.fired.at(index) > 0) {
        state.firedAt = sampleCount
      }
    },
  )

  let elapsed = Infinity
  let epoch = -1

  const widget: Widget = {
    type: 'overlay',
    pos: { x: [startCol, endCol], y: line },
    draw: (c, x, y, w, h) => {
      reader.run(++epoch)

      elapsed = reader.now - reader.state.firedAt
      const opacity = Math.max(0, 1 - elapsed / latency.value.state.sampleRate)
      impulse(c, opacity, x, y, w, h)
    },
  }
  cache.set(key, { doc, widget, historyRef })
  return widget
}
