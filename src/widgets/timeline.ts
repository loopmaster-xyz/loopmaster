import type { Signal } from '@preact/signals-core'
import type { Doc, Widget } from 'editor'
import {
  compileTimelineNotation,
  type DspLatency,
  getActiveTimelineSegIndex,
  getTimelineValue,
  getTimelineValueAtSample,
  readTimelineSegsFromCompiledTimeline,
  type TimelineHistory,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { indexToLoc, locToIndex } from '../lib/index-loc.ts'
import { getTimelineColor, primaryColor } from '../state.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { BEATS_PER_BAR, FUTURE_BARS, HEADER_PADDING_LEFT, PAST_BARS, TIME_WINDOW_BARS } from './constants.ts'

export function createTimelineWidgets(
  timeline: TimelineHistory,
  target: TypedHistory | UserCallHistory,
  doc: Doc,
  result: Signal<{ compile: { bpm: number } } | null>,
  latency: Signal<DspLatency>,
  timeSeconds: Signal<number>,
  cache: Map<string, WidgetCacheEntry>,
  options?: { noHeader?: boolean },
): Widget[] {
  const noHeader = options?.noHeader ?? false
  const line = target.source.line
  const widgets: Widget[] = []

  const dataRef = { current: { timeline, compiled: compileTimelineNotation(timeline.sequence) } }
  const callStart = locToIndex(doc.code, timeline.source.line, timeline.source.column)
  const fullKey = makeWidgetCacheKey('Timeline.full', callStart, callStart + 1, noHeader ? 1 : 0)
  const cachedFull = cache.get(fullKey) as { doc: Doc; widget: Widget; dataRef: typeof dataRef } | undefined
  if (cachedFull?.doc === doc) {
    cachedFull.dataRef.current = { timeline, compiled: compileTimelineNotation(timeline.sequence) }
    cachedFull.widget.pos = { y: line }
    widgets.push(cachedFull.widget)
  }
  else {
    cache.delete(fullKey)
  }

  const quoteIdx = doc.code.indexOf('\'', callStart)
  const patternStartIndex = quoteIdx >= 0 ? quoteIdx + 1 : callStart

  const compiled = dataRef.current.compiled
  const bytecode = compiled.bytecode
  const segsForWindow = (windowStartTime: number, windowEndTime: number) => {
    const bpm = result.value?.compile.bpm ?? 120
    const sampleRate = latency.value.state.sampleRate || 44100
    return readTimelineSegsFromCompiledTimeline(
      dataRef.current.compiled.bytecode,
      sampleRate,
      bpm,
      windowStartTime,
      windowEndTime,
    )
  }

  const fullWidget: Widget = {
    type: 'full',
    pos: { y: line },
    draw: (c, x, y, w, h, fw, contentLeft = 0) => {
      const bpm = result.value?.compile.bpm ?? 120
      const sampleRate = latency.value.state.sampleRate || 44100
      const barLengthSeconds = (BEATS_PER_BAR * 60) / bpm
      const windowStartTime = timeSeconds.value - PAST_BARS * barLengthSeconds
      const windowEndTime = timeSeconds.value + FUTURE_BARS * barLengthSeconds
      const windowDuration = windowEndTime - windowStartTime
      const offsetX = noHeader || fw == null ? x : HEADER_PADDING_LEFT - contentLeft + x
      const drawW = Math.max(1, noHeader || fw == null ? w : fw - HEADER_PADDING_LEFT)
      const pixelsPerSecond = windowDuration > 0 ? drawW / windowDuration : 0
      const currentTimeX = (PAST_BARS * barLengthSeconds / (TIME_WINDOW_BARS * barLengthSeconds)) * drawW

      const segs = segsForWindow(windowStartTime - barLengthSeconds * 3, windowEndTime + barLengthSeconds)
      const windowStartSample = windowStartTime * sampleRate

      c.save()
      c.translate(offsetX, y)

      const drawH = h // Math.max(40, h)

      // const firstBarStart = Math.max(0, Math.floor(windowStartTime / barLengthSeconds) * barLengthSeconds)
      // const beatLengthSeconds = 60 / bpm
      // for (let barStart = firstBarStart; barStart < windowEndTime; barStart += barLengthSeconds) {
      //   const barIndex = Math.round(barStart / barLengthSeconds)
      //   const isEvenBar = barIndex % 2 === 0
      //   const barX = (barStart - windowStartTime) * pixelsPerSecond
      //   const barWidth = barLengthSeconds * pixelsPerSecond
      //   c.fillStyle = isEvenBar ? 'rgba(128,128,128,0.08)' : 'rgba(128,128,128,0.04)'
      //   c.fillRect(barX, 0, barWidth, drawH)
      // }

      // c.strokeStyle = 'rgba(0,0,0,0.15)'
      // c.lineWidth = 0.25
      // const firstBeatStart = Math.floor(windowStartTime / beatLengthSeconds) * beatLengthSeconds
      // for (let beatStart = firstBeatStart; beatStart < windowEndTime; beatStart += beatLengthSeconds) {
      //   const px = (beatStart - windowStartTime) * pixelsPerSecond
      //   c.beginPath()
      //   c.moveTo(px, 0)
      //   c.lineTo(px, drawH)
      //   c.stroke()
      // }

      const curveColor = getTimelineColor(
        (dataRef.current.timeline as TimelineHistory & { colorIndex?: number }).colorIndex,
      )
      c.strokeStyle = curveColor
      c.lineWidth = 1.35
      const timeWindowSeconds = TIME_WINDOW_BARS * barLengthSeconds
      const sampleToPx = (samp: number) => ((samp - windowStartSample) / (timeWindowSeconds * sampleRate)) * drawW

      const minVerticalGap = 0.5
      c.beginPath()
      let prevSample = windowStartSample
      let started = false
      let lastX = 0
      let si = 0
      for (let px = -offsetX; px <= drawW; px += 2) {
        const t = px / drawW
        let sample = windowStartSample + t * timeWindowSeconds * sampleRate
        if (px >= drawW) sample -= 0.001
        if (sample < -offsetX) continue

        const r = getTimelineValue(segs, si, sample)
        si = r.si
        const v = r.v
        const vy = (1 - v) * (drawH - 2) + 1

        if (!started) {
          c.moveTo(px, vy)
          prevSample = sample
          lastX = px
          started = true
          continue
        }

        const boundaries: number[] = []
        for (let k = 0; k < segs.length; k++) {
          const ss = segs[k]!
          if (ss.startSample > prevSample && ss.startSample <= sample) boundaries.push(ss.startSample)
        }

        if (boundaries.length === 0) {
          c.lineTo(px, vy)
          prevSample = sample
          lastX = px
        }
        else {
          for (const boundarySample of boundaries) {
            const boundaryPx = sampleToPx(boundarySample)
            if (Math.abs(boundaryPx - lastX) < minVerticalGap) continue
            const beforeVal = getTimelineValueAtSample(segs, boundarySample - 1)
            const afterVal = getTimelineValueAtSample(segs, boundarySample)
            const yBefore = (1 - beforeVal) * (drawH - 2) + 1
            const yAfter = (1 - afterVal) * (drawH - 2) + 1
            c.lineTo(boundaryPx, yBefore)
            c.lineTo(boundaryPx, yAfter)
            lastX = boundaryPx
          }
          c.lineTo(px, vy)
          prevSample = sample
          lastX = px
        }
      }
      c.stroke()

      // c.strokeStyle = 'rgba(255,255,0,0.8)'
      // c.lineWidth = 2
      // c.beginPath()
      // c.moveTo(currentTimeX, 0)
      // c.lineTo(currentTimeX, drawH)
      // c.stroke()

      c.restore()
    },
  }
  if (!cachedFull?.doc || cachedFull.doc !== doc) {
    cache.set(fullKey, { doc, widget: fullWidget, dataRef })
    widgets.push(fullWidget)
  }

  const tokens = dataRef.current.timeline.segmentTokens ?? compiled.tokens
  const wraps = (bytecode[3] as number) >= 0
  const lastSegIdx = tokens.length - 1
  for (let segIdx = 0; segIdx < tokens.length; segIdx++) {
    const t = tokens[segIdx]!

    const renderToken = (tokenStart: number, tokenLength: number, isFrom: boolean) => {
      if (tokenStart < 0) return
      const length = Math.max(1, tokenLength)
      const absStart = patternStartIndex + tokenStart
      const locStart = indexToLoc(doc.code, absStart)
      const locEnd = indexToLoc(doc.code, absStart + length)
      if (locStart.line !== line) return
      const startCol = locStart.column
      const endCol = locEnd.line === line ? locEnd.column : startCol + length
      const isLastTo = !isFrom && segIdx === lastSegIdx
      const overlayKey = makeWidgetCacheKey(
        'Timeline.overlay',
        absStart,
        absStart + length,
        segIdx,
        isFrom ? 1 : 0,
        noHeader ? 1 : 0,
      )
      const cachedOverlay = cache.get(overlayKey) as { doc: Doc; widget: Widget; dataRef: typeof dataRef } | undefined
      if (cachedOverlay?.doc === doc) {
        cachedOverlay.dataRef.current = dataRef.current
        cachedOverlay.widget.pos = { x: [startCol, endCol], y: line }
        widgets.push(cachedOverlay.widget)
        return
      }
      cache.delete(overlayKey)

      const overlayWidget: Widget = {
        type: 'overlay',
        pos: { x: [startCol, endCol], y: line },
        draw: (c, x, y, w, h) => {
          const bc = dataRef.current.compiled.bytecode
          const sampleRate = latency.value.state.sampleRate || 44100
          const bpm = result.value?.compile.bpm ?? 120
          const sampleCount = Math.round(timeSeconds.value * sampleRate)
          const active = getActiveTimelineSegIndex(bc, sampleCount, sampleRate, bpm)
          if (!active) return
          const tt = active.tt
          let alpha: number
          if (active.si === segIdx) {
            alpha = isFrom ? 0.25 * (1 - tt) : 0.25 * tt
          }
          else if (wraps && isLastTo && active.si === 0) {
            const totalBars = Math.abs(bc[3] as number)
            const beatDiv = bc[4] as number
            const cycleBeats = totalBars * beatDiv
            const beatAbs = sampleCount * (bpm / 60) / sampleRate
            const cycle = Math.floor(beatAbs / cycleBeats)
            if (cycle < 1) return
            alpha = 0.25 * (1 - tt)
          }
          else return
          c.fillStyle = `rgba(255,255,255,${alpha})`
          c.fillRect(x - 2, y - 2, w + 4, h - 1)
        },
      }
      cache.set(overlayKey, { doc, widget: overlayWidget, dataRef })
      widgets.push(overlayWidget)
    }

    renderToken(t.fromTokenStart, t.fromTokenLength, true)
    if (t.fromTokenStart !== t.toTokenStart || t.fromTokenLength !== t.toTokenLength) {
      renderToken(t.toTokenStart, t.toTokenLength, false)
    }
  }

  return widgets
}
