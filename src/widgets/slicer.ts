import type { Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import {
  createHistoryReader,
  type Dsp,
  type DspLatency,
  type SlicerHistory,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { locToIndex } from '../lib/index-loc.ts'
import { grayColor, primaryColor, secondaryColor, theme } from '../state.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { getFunctionCallLength } from './util.ts'
import { updateWaveformCache, type WaveformCache } from './waveform-cache.ts'

const LINE_WIDTH = 1.35
const SLICE_LABEL_PADDING = 2

export function createSlicerWidget(
  slicer: SlicerHistory,
  target: TypedHistory | UserCallHistory,
  dsp: Dsp,
  doc: Doc,
  latency: Signal<DspLatency>,
  waveformCaches: Map<number, WaveformCache>,
  widgetsCache: Map<string, WidgetCacheEntry>,
): Widget {
  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const line = target.source.line

  const startIndex = locToIndex(doc.code, line, startCol)
  const endIndex = locToIndex(doc.code, line, endCol)
  const key = makeWidgetCacheKey('Slicer', startIndex, endIndex)
  const cached = widgetsCache.get(key) as
    | { doc: Doc; widget: Widget; historyRef: { current: SlicerHistory } }
    | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = slicer
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  widgetsCache.delete(key)

  const historyRef = { current: slicer }
  const reader = createHistoryReader(
    slicer.size,
    slicer.mask,
    {
      sample: 0,
      threshold: 0,
      slice: 0,
      slicePosition: 0,
      slicePlaying: 0,
    },
    state => {
      state.sample = 0
      state.threshold = 0
      state.slice = 0
      state.slicePosition = 0
      state.slicePlaying = 0
    },
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index) => {
      const h = historyRef.current
      state.sample = h.params.sample.at(index)
      state.threshold = h.params.threshold.at(index)
      state.slice = h.emit.currentSlice.at(index)
      state.slicePosition = h.emit.slicePosition.at(index)
      state.slicePlaying = h.emit.slicePlaying.at(index)
    },
  )

  let epoch = 0
  let cache = waveformCaches.get(historyRef.current.index) ?? null

  const draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    reader.run(++epoch)
    const { sample, threshold, slice, slicePosition, slicePlaying } = reader.state
    const sampleData = dsp.sampleManager.getSample(sample)
    const channels = sampleData?.ready && sampleData.channels.length ? sampleData.channels : null
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
    const length = sampleData?.length ?? 1
    const { points, count } = dsp.sampleManager.getSlices(sample, threshold)

    if (w > 300) {
      c.strokeStyle = grayColor.value
      c.lineWidth = LINE_WIDTH
      for (let i = 0; i < count; i++) {
        const sampleStart = points[i] ?? 0
        const sliceX = x + (sampleStart / length) * w
        c.beginPath()
        c.moveTo(sliceX, y)
        c.lineTo(sliceX, y + h)
        c.stroke()
      }
    }

    cache = updateWaveformCache(cache, w, h, dpr, channels)
    if (cache) {
      waveformCaches.set(historyRef.current.index, cache)
      c.drawImage(cache.canvas, x, y, w, h)
    }

    if (w > 300) {
      c.font = '8px Outfit'
      for (let i = 0; i < count; i++) {
        const isEven = i % 2 === 0
        c.textBaseline = isEven ? 'top' : 'bottom'
        const sampleStart = points[i] ?? 0
        const sliceX = x + (sampleStart / length) * w
        const label = (i / count).toFixed(2).slice(2)
        const labelY = isEven ? y + SLICE_LABEL_PADDING : y + h
        c.strokeStyle = theme.value.black
        c.lineWidth = .5
        c.strokeText(label, sliceX + SLICE_LABEL_PADDING, labelY)
        c.fillStyle = theme.value.white
        c.fillText(label, sliceX + SLICE_LABEL_PADDING, labelY)
        c.fillStyle = primaryColor.value
        c.beginPath()
        c.arc(sliceX, labelY, 1.5, 0, 2 * Math.PI)
        c.fill()
      }
    }

    if (slicePlaying && slice >= 0 && slice < count) {
      const sliceStart = points[(slice * count) | 0] ?? 0
      const absoluteSample = sliceStart + slicePosition
      const playX = x + (absoluteSample / length) * w
      c.strokeStyle = secondaryColor.value
      c.lineWidth = LINE_WIDTH
      c.beginPath()
      c.moveTo(playX, y)
      c.lineTo(playX, y + h)
      c.stroke()
    }
  }

  const widget: Widget = {
    type: 'above',
    pos: { x: [startCol, endCol], y: line },
    draw,
  }
  widgetsCache.set(key, { doc, widget, historyRef })
  return widget
}
