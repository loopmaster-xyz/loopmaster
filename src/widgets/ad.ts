import { type Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import {
  type AdHistory,
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
import { applyCurve, getFunctionCallLength } from './util.ts'

export function createAdWidget(ad: AdHistory, target: TypedHistory | UserCallHistory, doc: Doc,
  latency: Signal<DspLatency>, cache: Map<string, WidgetCacheEntry>): Widget
{
  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const line = target.source.line

  const startIndex = locToIndex(doc.code, line, startCol)
  const endIndex = locToIndex(doc.code, line, endCol)
  const key = makeWidgetCacheKey('Ad', startIndex, endIndex)
  const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: AdHistory } } | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = ad
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  cache.delete(key)

  const historyRef = { current: ad }
  const reader = createHistoryReader(
    ad.size,
    ad.mask,
    {
      stage: 0,
      attack: 0,
      decay: 0,
      exponent: 1,
      env: 0,
    },
    state => {
      state.stage = 0
      // state.attack = 0
      // state.decay = 0
      // state.exponent = 1
      state.env = 0
      // console.log('clear')
    },
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index) => {
      const h = historyRef.current
      state.stage = h.emit.stage.at(index)
      state.attack = h.params.attack.at(index)
      state.decay = h.params.decay.at(index)
      state.exponent = h.params.exponent.at(index)
      state.env = h.emit.env.at(index)
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

    const { stage, attack, decay, exponent, env } = reader.state
    const total = attack + decay
    const padding = LINE_WIDTH / 2
    const plotW = w - padding * 2
    const plotH = h // - padding * 2
    const plotX = padding
    const plotY = 0 // padding
    let playX = 0
    let playY = 0

    if (total > 0) {
      // Attack phase (curved)
      const attackW = (attack / total) * plotW
      c.moveTo(plotX, plotY + plotH)
      const attackPoints = Math.max(2, Math.ceil(attackW))
      for (let i = 0; i <= attackPoints; i++) {
        const t = i / attackPoints
        const x = plotX + t * attackW
        const y = plotY + plotH - applyCurve(t, exponent) * plotH
        if (i === 0) c.moveTo(x, y)
        else c.lineTo(x, y)
      }

      // Decay phase (curved)
      const decayW = plotW - attackW
      const decayPoints = Math.max(2, Math.ceil(decayW))
      for (let i = 1; i <= decayPoints; i++) {
        const t = i / decayPoints
        const x = plotX + attackW + t * decayW
        const y = plotY + plotH - applyCurve(1 - t, exponent) * plotH
        c.lineTo(x, y)
      }

      // if (pl) {
      const phase = stage | 0
      const t = env
      if (phase === 0) {
        playX = plotX
        playY = plotY + plotH
      }
      else {
        playX = (phase === 1) ? (plotX + t * attackW) : (plotX + attackW + (1 - t) * decayW)
        // const lvl = (phase === 1) ? applyCurve(t, exponent) : applyCurve(1 - t, exponent)
        playY = plotY + plotH - env * plotH
      }
      // }
    }

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
    // c.fillStyle = primaryColor.value
    // c.beginPath()
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
