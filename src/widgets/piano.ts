import type { Signal } from '@preact/signals'
import { type Doc, type Widget } from 'editor'
import {
  createHistoryReader,
  type DspLatency,
  type EmitHistory,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { locToIndex } from '../lib/index-loc.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { computePianoRange, drawPianoViz } from './piano-viz.ts'
import { getFunctionCallLength } from './util.ts'

export { BLACK_KEY_STEPS, countWhiteKeys, isBlackKey } from './piano-viz.ts'

export function createPianoWidget(
  history: EmitHistory,
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
  const key = makeWidgetCacheKey('Piano', startIndex, endIndex)
  const cached = cache.get(key) as {
    doc: Doc
    widget: Widget
    historyRef: { current: EmitHistory }
    notes: number[]
  } | undefined
  if (cached?.doc === doc) {
    if (cached.historyRef.current !== history) {
      cached.notes.length = 0
    }
    cached.historyRef.current = history
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  cache.delete(key)

  const historyRef = { current: history }
  const notes: number[] = []
  const reader = createHistoryReader(
    history.size,
    history.mask,
    { value: 0 },
    () => {},
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index) => {
      state.value = historyRef.current.params.value.at(index)
    },
  )

  let epoch = -1
  const widget: Widget = {
    type: 'above',
    pos: { x: [startCol, endCol], y: line },
    draw: (c, x, y, w, h) => {
      reader.run(++epoch)
      const v = Math.round(reader.state.value)
      if (v === 0) return
      if (notes.length === 0 || notes[notes.length - 1] !== v) {
        notes.push(v)
        if (notes.length > 10) notes.shift()
      }
      const min = Math.min(...notes)
      const max = Math.max(...notes)

      const { low, high } = computePianoRange(min, max, v)
      drawPianoViz(c, x, y, w, h, low, high, v)
    },
  }
  cache.set(key, { doc, widget, historyRef, notes })
  return widget
}
