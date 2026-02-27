import { type Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import {
  type AdHistory,
  createHistoryReader,
  type DspLatency,
  type LfosineHistory,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { locToIndex } from '../lib/index-loc.ts'
import { primaryColor, primaryDarkColor, theme } from '../state.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { LINE_WIDTH } from './constants.ts'
import { applyCurve, clamp01, getFunctionCallLength } from './util.ts'

function fract(n: number): number {
  return n - Math.floor(n)
}

function lfoValue(type: string, phase01: number): number {
  const p = fract(phase01)
  if (type === 'sine') return 0.5 + 0.5 * Math.sin(p * Math.PI * 2)
  if (type === 'tri') {
    const q = fract(p + 0.25)
    const y11 = q < 0.5 ? 4 * q - 1 : 3 - 4 * q
    return 0.5 + 0.5 * y11
  }
  if (type === 'saw') return fract(p + 0.5)
  if (type === 'ramp') return 1 - fract(p + 0.5)
  if (type === 'sqr') return p < 0.5 ? phase01 >= 1 ? 0 : 1 : 0
  return 0
}

export function createLfoWidget(
  lfo: LfosineHistory,
  target: TypedHistory | UserCallHistory,
  doc: Doc,
  latency: Signal<DspLatency>,
  lfoType: 'sine' | 'tri' | 'saw' | 'ramp' | 'sqr' | 'sah' | 'linear',
  cache: Map<string, WidgetCacheEntry>,
): Widget {
  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const line = target.source.line

  const startIndex = locToIndex(doc.code, line, startCol)
  const endIndex = locToIndex(doc.code, line, endCol)
  const key = makeWidgetCacheKey('Lfo', startIndex, endIndex, lfoType)
  const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: LfosineHistory } } | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = lfo
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  cache.delete(key)

  const historyRef = { current: lfo }
  const reader = createHistoryReader(
    lfo.size,
    lfo.mask,
    {
      phase: 0,
    },
    () => {},
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index) => {
      state.phase = historyRef.current.emit.phase.at(index)
    },
  )

  let epoch = 0

  const draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    reader.run(++epoch)

    c.save()
    c.translate(x, y)

    // w = Math.min(w, 70)

    c.lineCap = 'round'
    c.lineJoin = 'round'

    c.strokeStyle = primaryColor.value
    c.lineWidth = LINE_WIDTH

    c.beginPath()

    const { phase } = reader.state
    const padding = LINE_WIDTH / 2
    const plotW = w - padding * 2
    const plotH = h // - padding * 2
    const plotX = padding
    const plotY = 0 // padding
    let playX = phase * plotW
    let playY = 0

    const yToPx = (y: number) => plotY + (1 - clamp01(y)) * plotH

    c.beginPath()
    const steps = 96 * 4
    const isSaw = lfoType === 'saw'
    const isRamp = lfoType === 'ramp'
    const isSah = lfoType === 'sah'
    const xWrap = plotW
    c.moveTo(0, yToPx(0))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      let yy = 0
      // if (isSah || isSmooth || isFractal) {
      //   yy = t
      // }
      if (lfoType === 'linear' || isSah) {
        yy = t
      }
      else if (isSaw) {
        yy = fract(t + 0.5)
      }
      else if (isRamp) {
        yy = 1 - fract(t + 0.5)
      }
      else {
        yy = lfoValue(lfoType, t)
      }
      const px = t * xWrap
      const py = yToPx(yy)
      // if (i === 0) c.moveTo(px, py)
      // else c.lineTo(px, py)
      c.lineTo(px, py)
    }
    c.lineTo(xWrap, yToPx(0))
    c.closePath()
    // c.stroke()
    c.lineWidth = 1.35

    c.fillStyle = primaryDarkColor.value
    c.fill()
    // c.stroke()

    // c.save()
    c.strokeStyle = primaryColor.value
    c.lineWidth = LINE_WIDTH
    c.beginPath()
    c.moveTo(playX, plotY)
    c.lineTo(playX, plotY + plotH)
    c.stroke()
    c.fillStyle = primaryColor.value
    c.beginPath()
    // c.arc(playX, playY, 2, 0, Math.PI * 2)
    // c.fill()
    // c.restore()
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
