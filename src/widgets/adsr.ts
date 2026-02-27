import { type Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import {
  type AdsrHistory,
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
import { applyCurve, clamp01, getFunctionCallLength } from './util.ts'

export function createAdsrWidget(adsr: AdsrHistory, target: TypedHistory | UserCallHistory, doc: Doc,
  latency: Signal<DspLatency>, cache: Map<string, WidgetCacheEntry>): Widget
{
  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const line = target.source.line

  const startIndex = locToIndex(doc.code, line, startCol)
  const endIndex = locToIndex(doc.code, line, endCol)
  const key = makeWidgetCacheKey('Adsr', startIndex, endIndex)
  const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: AdsrHistory } } | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = adsr
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  cache.delete(key)

  const historyRef = { current: adsr }
  const reader = createHistoryReader(
    adsr.size,
    adsr.mask,
    {
      stage: 0,
      attack: 0,
      decay: 0,
      sustain: 0,
      release: 0,
      exponent: 1,
      env: 0,
    },
    state => {
      state.stage = 0
      state.env = 0
    },
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index) => {
      const h = historyRef.current
      state.stage = h.emit.stage.at(index)
      state.attack = h.params.attack.at(index)
      state.decay = h.params.decay.at(index)
      state.sustain = h.params.sustain.at(index)
      state.release = h.params.release.at(index)
      state.exponent = h.params.exponent.at(index)
      state.env = h.emit.env.at(index)
    },
  )

  let epoch = 0

  const draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    reader.run(++epoch)

    c.save()
    c.translate(x, y)

    c.lineCap = 'round'
    c.lineJoin = 'round'

    c.strokeStyle = primaryColor.value
    c.lineWidth = LINE_WIDTH

    c.beginPath()

    const { stage, attack, decay, sustain, release, exponent, env } = reader.state
    const sustainCurved = applyCurve(clamp01(sustain), exponent)
    const attackMax = Math.max(0, attack)
    const decayMax = Math.max(0, decay)
    const releaseMax = Math.max(0, release)
    const adTotal = attackMax + decayMax
    const padding = LINE_WIDTH / 2
    const plotW = w - padding * 2
    const plotH = h
    const plotX = padding
    const plotY = 0
    let playX = 0
    let playY = 0

    if (adTotal > 0 || releaseMax > 0) {
      const totalTime = attackMax + decayMax + 0.5 + releaseMax
      const attackRatio = attackMax / totalTime
      const decayRatio = decayMax / totalTime
      const sustainRatio = 0.5 / totalTime
      const releaseRatio = releaseMax / totalTime

      const attackW = attackRatio * plotW
      const decayW = decayRatio * plotW
      const sustainW = sustainRatio * plotW
      const releaseW = releaseRatio * plotW

      const decayX = attackW + decayW
      const sustainEndX = decayX + sustainW

      c.moveTo(plotX, plotY + plotH)

      if (attackW > 0) {
        const attackPoints = Math.max(2, Math.ceil(attackW))
        for (let i = 0; i <= attackPoints; i++) {
          const t = i / attackPoints
          const px = plotX + t * attackW
          const py = plotY + plotH - applyCurve(t, exponent) * plotH
          if (i === 0) c.moveTo(px, py)
          else c.lineTo(px, py)
        }
      }

      if (decayW > 0) {
        const sustainY = plotY + plotH - (sustainCurved * plotH)
        const decayPoints = Math.max(2, Math.ceil(decayW))
        for (let i = 0; i <= decayPoints; i++) {
          const t = i / decayPoints
          const px = plotX + attackW + t * decayW
          const py = plotY + plotH - (applyCurve(1 - t, exponent) * (1 - sustainCurved) + sustainCurved) * plotH
          c.lineTo(px, py)
        }
      }

      const sustainY = plotY + plotH - (sustainCurved * plotH)
      if (sustainW > 0) {
        c.lineTo(plotX + sustainEndX, sustainY)
      }

      if (releaseW > 0) {
        const releasePoints = Math.max(2, Math.ceil(releaseW))
        for (let i = 0; i <= releasePoints; i++) {
          const t = i / releasePoints
          const px = plotX + sustainEndX + t * releaseW
          const py = plotY + plotH - (applyCurve(1 - t, exponent) * sustainCurved) * plotH
          c.lineTo(px, py)
        }
      }

      const phase = stage | 0
      const t = clamp01(env)
      if (phase === 0) {
        playX = plotX
        playY = plotY + plotH
      }
      else if (phase === 1) {
        playX = plotX + t * attackW
        playY = plotY + plotH - applyCurve(t, exponent) * plotH
      }
      else if (phase === 2) {
        playX = plotX + attackW + t * decayW
        playY = plotY + plotH - (applyCurve(1 - t, exponent) * (1 - sustainCurved) + sustainCurved) * plotH
      }
      else if (phase === 3) {
        playX = plotX + attackW + decayW + t * sustainW
        playY = sustainY
      }
      else if (phase === 4) {
        playX = plotX + sustainEndX + t * releaseW
        playY = plotY + plotH - (applyCurve(1 - t, exponent) * sustainCurved) * plotH
      }
      else {
        playX = plotX
        playY = plotY + plotH
      }
    }

    c.fillStyle = primaryDarkColor.value
    c.fill()

    c.strokeStyle = primaryColor.value
    c.lineWidth = LINE_WIDTH
    c.beginPath()
    c.moveTo(playX, plotY)
    c.lineTo(playX, plotY + plotH)
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
