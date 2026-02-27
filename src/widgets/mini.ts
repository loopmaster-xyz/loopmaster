import type { Signal } from '@preact/signals-core'
import type { Widget } from 'editor'
import type { Doc } from 'editor'
import {
  type ControlCompileSnapshot,
  createHistoryReader,
  type Dsp,
  type DspLatency,
  type MiniHistory,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { indexToLoc, locToIndex } from '../lib/index-loc.ts'
import { primaryColor, secondaryColor } from '../state.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { BEATS_PER_BAR, FUTURE_BARS, HEADER_PADDING_LEFT, PAST_BARS } from './constants.ts'
import { computePianoRange, drawPianoViz } from './piano-viz.ts'
import { getFunctionCallLength, impulse } from './util.ts'

const DEBUG_PREVIEW_TIMING = typeof window !== 'undefined'
  && (window as { __DEBUG_PREVIEW_TIMING__?: boolean }).__DEBUG_PREVIEW_TIMING__

function hzToNote(hz: number): number {
  return Math.round(Math.log2(hz / 440) * 12 + 69)
}

export function createMiniWidgets(
  mini: MiniHistory,
  target: TypedHistory | UserCallHistory,
  dsp: Dsp,
  doc: Doc,
  currentResult: Signal<ControlCompileSnapshot | null>,
  latency: Signal<DspLatency>,
  timeSeconds: Signal<number>,
  cache: Map<string, WidgetCacheEntry>,
  options?: { noHeader?: boolean },
): Widget[] {
  const noHeader = options?.noHeader ?? false
  const line = target.source.line
  const historyRef = { current: mini }
  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const startIndex = locToIndex(doc.code, line, startCol)
  const endIndex = locToIndex(doc.code, line, endCol)

  const fullKey = makeWidgetCacheKey('Mini.full', startIndex, endIndex, noHeader ? 1 : 0)
  const cachedFull = cache.get(fullKey) as { doc: Doc; widget: Widget; historyRef: typeof historyRef;
    activeOps: Set<number> } | undefined
  const activeOps = cachedFull?.doc === doc ? cachedFull.activeOps : new Set<number>()

  let ops: Widget[] = []
  const opsKey = makeWidgetCacheKey('Mini.ops', startIndex, endIndex, noHeader ? 1 : 0)
  const cachedOps = cache.get(opsKey) as { doc: Doc; widgets: Widget[]; compileKey: string } | undefined
  const compileKey = historyRef.current.compileResult
    ? `${historyRef.current.compileResult.bytecode.length}:${historyRef.current.compileResult.sourceMap.length}`
    : 'none'
  if (currentResult.value && historyRef.current.compileResult) {
    const src = currentResult.value.parse.src
    let sequenceIndex = locToIndex(src, mini.source.line, mini.source.column)
    sequenceIndex = src.indexOf(`'`, sequenceIndex) + 1 // skip the quote

    const createOpWidget = (opIndex: number, x: [start: number, end: number], y: number): Widget => {
      let firedAt = -Infinity
      let elapsed = Infinity
      return {
        type: 'overlay',
        pos: { x, y },
        draw: (c, x, y, w, h) => {
          if (activeOps.has(opIndex)) {
            firedAt = performance.now()
          }

          elapsed = performance.now() - firedAt

          const opacity = Math.max(0, 1 - elapsed / 1000)
          impulse(c, opacity, x, y, w, h)
        },
      }
    }

    ops = historyRef.current.compileResult.sourceMap.filter(x => x.source.text !== '').map(entry => {
      let { line: startLine, column: startColumn } = indexToLoc(src, sequenceIndex + entry.source.start)
      let { line: endLine, column: endColumn } = indexToLoc(src,
        sequenceIndex + entry.source.start + entry.source.length)
      if (startLine !== endLine) {
        const op1 = createOpWidget(entry.eventIndex, [
          startColumn,
          src.split('\n')[startLine - 1].length,
        ], startLine)
        const op2 = createOpWidget(entry.eventIndex, [
          0,
          endColumn,
        ], endLine)
        return [op1, op2]
      }
      return createOpWidget(entry.eventIndex, [startColumn, endColumn], startLine)
    }).flat()
    cache.set(opsKey, {
      doc,
      widget: ops[0] ?? { type: 'overlay', pos: { x: [0, 0], y: line }, draw: () => {} },
      widgets: ops,
      compileKey,
    })
  }
  else if (cachedOps?.doc === doc && cachedOps.compileKey === compileKey) {
    ops = cachedOps.widgets
  }

  const pianoAboveState = {
    noteMin: 60,
    noteMax: 72,
    currentNotes: new Set<number>(),
  }

  type MiniPreviewCache = { key: string;
    entries: Array<
      { opIndex: number; voiceIndex: number; value: number; velocity: number; startSeconds: number; endSeconds: number }
    > }

  let pianoroll: Widget
  if (cachedFull?.doc === doc) {
    cachedFull.historyRef.current = mini
    cachedFull.widget.pos = { y: line }
    pianoroll = cachedFull.widget
  }
  else {
    cache.delete(fullKey)
    const reader = createHistoryReader(
      historyRef.current.size,
      historyRef.current.mask,
      { bars: 0 },
      () => {},
      () => latency.value.state,
      () => historyRef.current.writeIndex,
      index => historyRef.current.sampleCounts[index],
      (state, index) => {
        state.bars = historyRef.current.params.bars.at(index)
      },
    )

    let epoch = 0
    const miniPreviewCache: MiniPreviewCache = { key: '', entries: [] }

    pianoroll = {
      type: 'full',
      pos: { y: line },
      draw: (c, x, y, w, h, fw, contentLeft = 0) => {
        const m = historyRef.current
        if (!m.compileResult) return

        reader.run(++epoch)
        const bars = reader.state.bars
        if (bars === 0) return

        const offsetX = noHeader || fw == null ? x : HEADER_PADDING_LEFT - contentLeft + x
        if (!noHeader && fw != null) w = fw - HEADER_PADDING_LEFT

        c.save()
        c.translate(offsetX, y)

        const bpm = currentResult.value?.compile.bpm || 120
        const barLengthSeconds = (BEATS_PER_BAR * 60) / bpm
        const windowStart = timeSeconds.value - PAST_BARS * barLengthSeconds
        const windowEnd = timeSeconds.value + FUTURE_BARS * barLengthSeconds

        const windowDuration = windowEnd - windowStart
        const pxPerSecond = windowDuration > 0 ? w / windowDuration : 0

        const cacheKey = `${m.compileResult.bytecode.length}-${bars}-${windowStart.toFixed(1)}-${windowEnd.toFixed(1)}`
        let entries: MiniPreviewCache['entries']
        if (miniPreviewCache.key === cacheKey) {
          entries = miniPreviewCache.entries
        }
        else {
          const t0 = DEBUG_PREVIEW_TIMING ? performance.now() : 0
          entries = dsp.core.preview.runMiniPreview(
            m.compileResult,
            windowStart - 2,
            windowEnd,
            bars,
          )
          if (DEBUG_PREVIEW_TIMING) console.log('[mini] runMiniPreview call', (performance.now() - t0).toFixed(2), 'ms')
          miniPreviewCache.key = cacheKey
          miniPreviewCache.entries = entries
        }

        const entryToNote = new Map<typeof entries[0], number>()
        let noteMin = 128
        let noteMax = 0
        for (const entry of entries) {
          if (entry.voiceIndex < 0) continue
          const note = hzToNote(entry.value)
          entryToNote.set(entry, note)
          if (note < noteMin) noteMin = note
          if (note > noteMax) noteMax = note
        }
        if (noteMin > noteMax) {
          noteMin = 60
          noteMax = 72
        }

        pianoAboveState.noteMin = noteMin
        pianoAboveState.noteMax = noteMax
        pianoAboveState.currentNotes.clear()
        for (const entry of entries) {
          if (entry.voiceIndex < 0) continue
          const isPast = entry.startSeconds <= timeSeconds.value
          const isNow = isPast && entry.endSeconds >= timeSeconds.value - 0.01
          if (isNow) pianoAboveState.currentNotes.add(entryToNote.get(entry)!)
        }

        const scale = noteMax - noteMin
        const nh = h / (scale + 1)
        h -= nh
        activeOps.clear()
        for (const entry of entries) {
          if (entry.voiceIndex < 0) continue
          const note = entryToNote.get(entry)!
          const y = (noteMax - note) / scale
          const isPast = entry.startSeconds <= timeSeconds.value
          const isNow = isPast && entry.endSeconds >= timeSeconds.value - 0.01
          if (isNow) activeOps.add(entry.opIndex)
          c.fillStyle = isPast ? secondaryColor.value : primaryColor.value
          c.fillRect(
            (entry.startSeconds - windowStart) * pxPerSecond,
            y * h,
            (entry.endSeconds - entry.startSeconds) * pxPerSecond,
            nh,
          )
        }

        c.restore()
      },
    }
    cache.set(fullKey, { doc, widget: pianoroll, historyRef, activeOps })
  }

  const pianoAboveKey = makeWidgetCacheKey('Mini.pianoAbove', startIndex, endIndex, noHeader ? 1 : 0)
  const cachedPianoAbove = cache.get(pianoAboveKey) as
    | { doc: Doc; widget: Widget; historyRef: typeof historyRef }
    | undefined
  let pianoAbove: Widget
  if (cachedPianoAbove?.doc === doc) {
    cachedPianoAbove.historyRef.current = mini
    cachedPianoAbove.widget.pos = { x: [startCol, endCol], y: line }
    pianoAbove = cachedPianoAbove.widget
  }
  else {
    cache.delete(pianoAboveKey)
    pianoAbove = {
      type: 'above',
      pos: { x: [startCol, endCol], y: line },
      draw: (c, x, y, w, h) => {
        if (!historyRef.current.compileResult) return
        const { low, high } = computePianoRange(
          pianoAboveState.noteMin,
          pianoAboveState.noteMax,
          pianoAboveState.noteMin,
        )
        drawPianoViz(c, x, y, w, h, low, high, pianoAboveState.currentNotes)
      },
    }
    cache.set(pianoAboveKey, { doc, widget: pianoAbove, historyRef })
  }

  return [ops, pianoAbove, pianoroll].flat()
}
