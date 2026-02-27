import type { Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import {
  createHistoryReader,
  type Dsp,
  type DspLatency,
  type SamplerHistory,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { locToIndex } from '../lib/index-loc.ts'
import { secondaryColor } from '../state.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { getFunctionCallLength } from './util.ts'
import { updateWaveformCache, type WaveformCache } from './waveform-cache.ts'

const LINE_WIDTH = 1.35

export function createSamplerWidget(
  sampler: SamplerHistory,
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
  const key = makeWidgetCacheKey('Sampler', startIndex, endIndex)
  const cached = widgetsCache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: SamplerHistory } }
    | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = sampler
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  widgetsCache.delete(key)

  const historyRef = { current: sampler }
  const reader = createHistoryReader(
    sampler.size,
    sampler.mask,
    {
      sample: 0,
      offset: 0,
      position: 0,
      playing: 0,
    },
    state => {
      state.sample = 0
      state.offset = 0
      state.position = 0
      state.playing = 0
    },
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index) => {
      const h = historyRef.current
      state.sample = h.params.sample.at(index)
      state.offset = h.params.offset.at(index)
      state.position = h.emit.position.at(index)
      state.playing = h.emit.playing.at(index)
    },
  )

  let epoch = 0
  let cache = waveformCaches.get(historyRef.current.index) ?? null

  const draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    reader.run(++epoch)
    const { sample, offset, position, playing } = reader.state
    const sampleData = dsp.sampleManager.getSample(sample)
    const channels = sampleData?.ready && sampleData.channels.length ? sampleData.channels : null
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1

    cache = updateWaveformCache(cache, w, h, dpr, channels)
    if (cache) {
      waveformCaches.set(historyRef.current.index, cache)
      c.drawImage(cache.canvas, x, y, w, h)
    }

    const length = sampleData?.length ?? 1
    const playX = !playing ? x + offset * w : x + (position / length) * w
    c.strokeStyle = secondaryColor.value
    c.lineWidth = LINE_WIDTH
    c.beginPath()
    c.moveTo(playX, y)
    c.lineTo(playX, y + h)
    c.stroke()
  }

  const widget: Widget = {
    type: 'above',
    pos: { x: [startCol, endCol], y: line },
    draw,
  }
  widgetsCache.set(key, { doc, widget, historyRef })
  return widget
}
