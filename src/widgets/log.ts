import type { Signal } from '@preact/signals'
import { type Doc, drawText, type Widget } from 'editor'
import {
  createHistoryReader,
  type DspLatency,
  type EmitHistory,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { locToIndex } from '../lib/index-loc.ts'
import { grayColor } from '../state.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { getFunctionCallLength } from './util.ts'

export function createLogWidget(
  history: EmitHistory,
  target: TypedHistory | UserCallHistory,
  doc: Doc,
  latency: Signal<DspLatency>,
  mapFn: (value: number) => string,
  cache: Map<string, WidgetCacheEntry>,
): Widget {
  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const line = target.source.line

  const startIndex = locToIndex(doc.code, line, startCol)
  const endIndex = locToIndex(doc.code, line, endCol)
  const key = makeWidgetCacheKey('Log', startIndex, endIndex)
  const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: EmitHistory } } | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = history
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  cache.delete(key)

  const historyRef = { current: history }
  const reader = createHistoryReader(
    history.size,
    history.mask,
    {
      value: 0,
    },
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
      c.font = '12px "Liga Space Mono"'
      const v = reader.state.value
      const text = mapFn(v)
      drawText(c, text, x, y + h, grayColor.value)
    },
  }
  cache.set(key, { doc, widget, historyRef })
  return widget
}
