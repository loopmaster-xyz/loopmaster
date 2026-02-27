import { type Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import {
  type CompressorHistory,
  createHistoryReader,
  type DspLatency,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { locToIndex } from '../lib/index-loc.ts'
import { primaryColor, primaryDarkColor } from '../state.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { LINE_WIDTH } from './constants.ts'
import { clamp01, getFunctionCallLength } from './util.ts'

export function createCompressorWidget(
  compressor: CompressorHistory,
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
  const key = makeWidgetCacheKey('Compressor', startIndex, endIndex)
  const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: TypedHistory } } | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = compressor
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  cache.delete(key)

  const historyRef = { current: compressor }
  const reader = createHistoryReader(
    compressor.size,
    compressor.mask,
    {
      inputLevel: 0,
      gainReduction: 0,
      threshold: -12,
    },
    () => {},
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index) => {
      const h = historyRef.current
      state.inputLevel = h.emit.inputLevel.at(index)
      state.gainReduction = h.emit.gainReduction.at(index)
      state.threshold = h.params.threshold.at(index)
    },
  )

  let epoch = 0

  const draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    reader.run(++epoch)

    c.save()
    c.translate(x, y)

    c.lineCap = 'round'
    c.lineJoin = 'round'

    const { inputLevel, gainReduction, threshold } = reader.state
    const input = clamp01(inputLevel)
    const gain = clamp01(gainReduction)
    const thresholdLinear = Math.pow(10, Math.max(-80, Math.min(0, threshold)) / 20)

    const barH = Math.max(2, (h - 4) / 2)
    const pad = 2
    const barW = w - pad * 2
    const barX = pad

    // c.fillStyle = primaryDarkColor.value
    // c.fillRect(barX, pad, barW, barH)
    // c.fillRect(barX, pad + barH + pad, barW, barH)

    c.fillStyle = primaryDarkColor.value
    c.fillRect(barX, pad, input * barW, barH)
    c.fillRect(barX, pad + barH + pad, gain * barW, barH)

    c.strokeStyle = primaryColor.value
    c.lineWidth = LINE_WIDTH
    const thX = barX + thresholdLinear * barW
    c.beginPath()
    c.moveTo(thX, 0)
    c.lineTo(thX, h)
    c.stroke()

    c.restore()
  }

  const widget: Widget = {
    type: 'above',
    pos: { x: [startCol, endCol], y: line },
    draw,
  }
  cache.set(key, { doc, widget, historyRef })
  return widget
}
