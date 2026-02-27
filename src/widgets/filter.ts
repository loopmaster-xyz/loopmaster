import type { Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import {
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
import { filterMagDb, getFilterVizType, hzToX } from './filter-viz.ts'
import { clamp, getFunctionCallLength } from './util.ts'

type FilterState = {
  cutoff: number
  q: number
  gain: number
  k: number
}

function clampDb(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function createFilterWidget(
  filter: TypedHistory,
  target: TypedHistory | UserCallHistory,
  doc: Doc,
  latency: Signal<DspLatency>,
  cache: Map<string, WidgetCacheEntry>,
): Widget | null {
  const vizType = getFilterVizType(filter.genName, filter.variantName)
  if (vizType === null) return null

  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const line = target.source.line

  const startIndex = locToIndex(doc.code, line, startCol)
  const endIndex = locToIndex(doc.code, line, endCol)
  const key = makeWidgetCacheKey('Filter', startIndex, endIndex, filter.genName, filter.variantName ?? '')
  const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: TypedHistory } } | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = filter
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  cache.delete(key)

  const historyRef = { current: filter }
  const params = filter.params as Record<string, { at(i: number): number }>

  const reader = createHistoryReader(
    filter.size,
    filter.mask,
    {
      cutoff: 0,
      q: 0.707,
      gain: 0,
      k: 0,
    },
    state => {
      // state.cutoff = 0
      // state.q = 0.707
      // state.gain = 0
      // state.k = 0
    },
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index) => {
      const h = historyRef.current
      const p = h.params as Record<string, { at(i: number): number }>
      state.cutoff = p.cutoff?.at(index) ?? state.cutoff
      state.q = p.q?.at(index) ?? state.q
      state.gain = p.gain?.at(index) ?? state.gain
      state.k = p.k?.at(index) ?? state.k
    },
  )

  let epoch = 0

  const draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    reader.run(++epoch)

    const { cutoff: rawCutoff, q: rawQ, gain: rawGain, k: rawK } = reader.state
    const sr = latency.value.state.sampleRate ?? 48000
    const nyquist = Math.max(1, sr / 2)
    const minHz = 20
    const maxHz = Math.min(20000, nyquist)

    const isSvf = vizType === 'lps' || vizType === 'hps' || vizType === 'bps' || vizType === 'bss'
      || vizType === 'peaks' || vizType === 'aps'
    const isMoog = vizType === 'lpm' || vizType === 'hpm'
    const isDiodeLadder = vizType === 'diodeladder'
    const isOnePole = vizType === 'lp1' || vizType === 'hp1'

    const cutoff = clamp(
      rawCutoff || 1000,
      (isSvf || isMoog || isDiodeLadder || isOnePole) ? 20 : minHz,
      maxHz,
    )
    const q = clamp(rawQ || 0.707, 0.01, (isSvf || isMoog || isDiodeLadder) ? 0.985 : 20)
    const gain = rawGain ?? 0
    const dlQ = isDiodeLadder ? clamp(rawQ ?? 0.5, 0, 1) : undefined
    const dlK = isDiodeLadder ? clamp(rawK ?? 0, 0, 1) : undefined

    c.save()
    c.translate(x, y)

    // w = Math.min(w, 70)

    c.lineCap = 'round'
    c.lineJoin = 'round'

    // const bg = backgroundColor.value
    // c.fillStyle = bg
    // c.fillRect(0, 0, w, h)

    const fullThreshold = 58
    const mediumThreshold = 46
    const compactThreshold = 32

    let padX: number = 4
    let padY: number = 2
    let leftLabelW: number = 20
    let bottomLabelH: number = 9
    let showDbLabels: boolean
    let showFreqLabels: boolean
    let showParamLabels: boolean

    // if (h >= fullThreshold) {
    //   showDbLabels = true
    //   showFreqLabels = true
    //   showParamLabels = true
    // }
    // else if (h >= mediumThreshold) {
    //   showDbLabels = true
    //   showFreqLabels = true
    //   showParamLabels = true
    // }
    // else if (h >= compactThreshold) {
    //   bottomLabelH = 0
    //   showDbLabels = true
    //   showFreqLabels = false
    //   showParamLabels = true
    // }
    // else {
    padY = 0
    leftLabelW = 0
    bottomLabelH = 0
    showDbLabels = false
    showFreqLabels = false
    showParamLabels = false
    // }

    const chartX = leftLabelW > 0 ? leftLabelW : 0
    const chartY = 0
    const rightPad = padX
    const chartW = Math.max(1, w - chartX - rightPad)
    const chartH = Math.max(1, h - chartY - bottomLabelH - padY)

    const minDb = -24
    const maxDb = 16
    const dbToY = (db: number) => {
      const d = clampDb(db, minDb, maxDb)
      const t = (d - minDb) / (maxDb - minDb)
      return chartY + (1 - t) * chartH
    }

    c.save()
    c.translate(chartX, 0)

    // c.strokeStyle = 'rgba(150,150,150,0.25)'
    // c.lineWidth = 1
    // c.strokeRect(0, chartY + 0.5, chartW, chartH)

    const minMarkDy = clamp(chartH * 0.09, 8, 18)
    const stepChoices = [6, 12, 24]
    let stepDb = 6
    for (const s of stepChoices) {
      const dyUp = Math.abs(dbToY(s) - dbToY(0))
      const dyDown = Math.abs(dbToY(-s) - dbToY(0))
      if (Math.min(dyUp, dyDown) >= minMarkDy) {
        stepDb = s
        break
      }
      stepDb = s
    }

    const markSet = new Set<number>([minDb, 0, maxDb])
    for (let d = stepDb; d <= maxDb; d += stepDb) markSet.add(d)
    for (let d = -stepDb; d >= minDb; d -= stepDb) markSet.add(d)

    const dbMarks = [...markSet].sort((a, b) => b - a)

    if (showDbLabels) {
      c.font = h >= fullThreshold ? '9px "Outfit"' : '8px "Outfit"'
      c.textBaseline = 'middle'
      c.textAlign = 'right'
      c.fillStyle = 'rgba(180,180,180,0.7)'
    }
    c.strokeStyle = 'rgba(180,180,180,0.18)'

    // for (const v of dbMarks) {
    //   const yy = dbToY(v)
    //   if (showDbLabels && !(stepDb === 24 && v === -48)) {
    //     c.fillText(String(v), -6, yy)
    //   }
    //   if (v === 24 || v === -60) continue
    //   c.beginPath()
    //   c.moveTo(0, yy + 0.5)
    //   c.lineTo(chartW, yy + 0.5)
    //   c.stroke()
    // }

    const freqMarksByW = w < 250
      ? w < 200
        ? w < 100
          ? [50, 1000, 10000]
          : [50, 300, 1000, 3000, 10000]
        : [50, 100, 300, 1000, 3000, 10000]
      : [50, 100, 200, 500, 1000, 2000, 5000, 10000]
    const freqMarks = h >= mediumThreshold ? freqMarksByW : [50, 1000, 10000]

    c.textAlign = 'center'
    c.textBaseline = 'top'
    c.strokeStyle = 'rgba(180,180,180,0.14)'
    // for (const f of freqMarks) {
    //   if (f < minHz || f > maxHz) continue
    //   const xx = hzToX(f, minHz, maxHz, chartW)
    //   c.beginPath()
    //   c.moveTo(xx + 0.5, chartY)
    //   c.lineTo(xx + 0.5, chartY + chartH)
    //   c.stroke()
    //   if (showFreqLabels) {
    //     c.fillStyle = 'rgba(180,180,180,0.7)'
    //     const lbl = f >= 1000 ? `${(f / 1000).toFixed(f % 1000 === 0 ? 0 : 1)}k` : String(f)
    //     c.fillText(lbl, xx, chartY + chartH + 2)
    //   }
    // }

    const cutX = hzToX(cutoff, minHz, maxHz, chartW)
    const dbAtCutoff = filterMagDb(vizType, cutoff, cutoff, q, gain, sr, dlQ, dlK)
    const playY = dbToY(dbAtCutoff)

    // c.strokeStyle = primaryColor.value
    // c.lineWidth = LINE_WIDTH
    const steps = Math.min(256, Math.max(64, chartW | 0))
    c.beginPath()
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const freqHz = minHz * Math.exp(Math.log(maxHz / minHz) * t)
      const db = filterMagDb(vizType, freqHz, cutoff, q, gain, sr, dlQ, dlK)
      const px = t * chartW
      const py = dbToY(db)
      if (i === 0) c.moveTo(px, py)
      else c.lineTo(px, py)
    }
    c.lineTo(chartW, chartH)
    c.lineTo(0, chartH)
    c.closePath()
    c.fillStyle = primaryDarkColor.value
    c.fill()

    // c.strokeStyle = primaryColor.value
    // c.lineWidth = LINE_WIDTH
    // c.beginPath()
    // // const steps = Math.min(256, Math.max(64, chartW | 0))
    // for (let i = 0; i <= steps; i++) {
    //   const t = i / steps
    //   const freqHz = minHz * Math.exp(Math.log(maxHz / minHz) * t)
    //   const db = filterMagDb(vizType, freqHz, cutoff, q, gain, sr, dlQ, dlK)
    //   const px = t * chartW
    //   const py = dbToY(db)
    //   if (i === 0) c.moveTo(px, py)
    //   else c.lineTo(px, py)
    // }
    // c.stroke()

    // c.save()
    c.strokeStyle = primaryColor.value
    c.lineWidth = LINE_WIDTH
    c.beginPath()
    c.moveTo(cutX, chartY)
    c.lineTo(cutX, chartY + chartH)
    c.stroke()
    // c.fillStyle = primaryColor.value
    // c.beginPath()
    // c.arc(cutX, playY, 2.2, 0, Math.PI * 2)
    // c.fill()
    // c.restore()

    if (showParamLabels) {
      c.fillStyle = 'rgba(180,180,180,0.9)'
      c.font = '100 7px "Space Mono"'
      c.textBaseline = 'bottom'
      c.textAlign = 'left'
      const cutTxt = cutoff >= 1000
        ? `${(cutoff / 1000).toFixed(cutoff % 1000 === 0 ? 0 : 2)}kHz`
        : `${cutoff.toFixed(0)}Hz`

      const l = 2
      const lh = 8

      if (vizType === 'peak') {
        c.fillText(`c:${cutTxt}`, l, chartH - lh * 2)
        c.fillText(`q:${q.toFixed(3)}`, l, chartH - lh)
        c.fillText(`g:${gain >= 0 ? '+' : ''}${gain.toFixed(1)}dB`, l, chartH)
      }
      else if (vizType === 'ls' || vizType === 'hs') {
        c.fillText(`c:${cutTxt}`, l, chartH - lh)
        c.fillText(`g:${gain >= 0 ? '+' : ''}${gain.toFixed(1)}dB`, l, chartH)
      }
      else if (vizType === 'diodeladder') {
        c.fillText(`c:${cutTxt}`, l, chartH - lh * 2)
        c.fillText(`q:${(dlQ ?? 0.5).toFixed(3)}`, l, chartH - lh)
        c.fillText(`k:${(dlK ?? 0).toFixed(3)}`, l, chartH)
      }
      else if (vizType === 'lp1' || vizType === 'hp1') {
        c.fillText(`c:${cutTxt}`, l, chartH)
      }
      else {
        c.fillText(`c:${cutTxt}`, l, chartH - lh)
        c.fillText(`q:${q.toFixed(3)}`, l, chartH)
      }
    }

    c.restore()
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
