import type { Signal } from '@preact/signals-core'
import type { Doc, Widget } from 'editor'
import type { TypedHistory, UserCallHistory } from 'engine'
import { type Ring, toRing } from 'utils/ring'
import { locToIndex } from '../lib/index-loc.ts'
import { WaveformBuffer } from '../lib/waveform-buffer.ts'
import { settings } from '../settings.ts'
import { isActuallyPlaying, isPlaying, theme, waveFFT } from '../state.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { clamp11, getFunctionCallLength } from './util.ts'

const LINE_WIDTH = 1.35

function drawWaveform(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  multiplier: number,
  floats: Float32Array,
  isPlayingThis: boolean,
): number {
  const len = floats.length
  if (len < 2) return 0
  let max = .001
  if (isActuallyPlaying.value && isPlayingThis) {
    for (let i = 0; i < w; i++) {
      const j = floats.length - Math.floor(i / w * len)
      const value = floats[j] ?? 0
      const abs = Math.abs(value)
      if (abs > max) max = abs
    }
    const multiplierTarget = 1 / max
    if (multiplierTarget > multiplier) {
      multiplier += (multiplierTarget - multiplier) * 0.1
    }
    else {
      multiplier = multiplierTarget
    }
  }
  const mid = y + h / 2
  const amp = (h / 2) - 2
  c.strokeStyle = theme.value.yellow
  c.lineWidth = LINE_WIDTH
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.beginPath()
  for (let i = 0; i < w; i++) {
    const j = Math.floor(i / w * len)
    const value = floats[j] ?? 0
    const sy = mid - clamp11(value * multiplier) * amp
    if (i === 0) c.moveTo(x + i, sy)
    else c.lineTo(x + i, sy)
  }
  c.stroke()
  return multiplier
}

type FftState = {
  fft: any
  window: Float32Array
  windowed: Float32Array
}

type SpectrumCache = {
  barCount: number
  sr: number
  frequencyBinCount: number
  binIndex: Int32Array
  binFrac: Float32Array
  prefix: Float32Array
  avgHeights: Float32Array
}

const INV_LN10 = 1 / Math.LN10

function drawSpectrum(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  floats: Float32Array,
  animatedHeightsArr: Array<Float32Array | undefined>,
  analyserIndex: number,
  sampleRate: number | undefined,
  cacheMap: Map<number, SpectrumCache>,
) {
  if (w <= 1 || h <= 1) return
  if (!waveFFT.value) return

  w += 1
  const { fft, window, windowed } = waveFFT.value
  const fftSize = windowed.length

  if (floats.length < fftSize) return

  for (let i = 0; i < fftSize; i++) {
    windowed[i] = floats[i]! * window[i]!
  }

  const result = fft.fft(windowed)
  const magnitudes = fft.getMagnitudeSpectrum(result)
  const frequencyBinCount = magnitudes.length
  if (frequencyBinCount <= 1) return

  const sr = (sampleRate ?? 48000) | 0
  const nyquist = Math.max(1, sr / 2)
  const minFreq = 20
  const maxFreq = Math.min(20000, nyquist)

  const w0 = w | 0
  const barCount = Math.max(1, Math.min(256, w0, frequencyBinCount))
  const barWidth = w / barCount

  let animatedHeights = animatedHeightsArr[analyserIndex]
  if (!animatedHeights || animatedHeights.length !== barCount) {
    animatedHeights = new Float32Array(barCount)
    animatedHeightsArr[analyserIndex] = animatedHeights
  }

  const minDecibels = -40
  const maxDecibels = 65
  const gravity = 0.025 * h

  const cacheKey = barCount * 1_000_000_000 + sr * 10_000 + frequencyBinCount
  let cache = cacheMap.get(cacheKey)
  if (!cache) {
    const binIndex = new Int32Array(barCount)
    const binFrac = new Float32Array(barCount)

    const ratio = maxFreq / minFreq
    const logRatio = Math.log(ratio)
    const binScale = (frequencyBinCount - 1) / nyquist
    const maxIdx = Math.max(0, frequencyBinCount - 2)

    for (let i = 0; i < barCount; i++) {
      const t = i / barCount
      const freq = minFreq * Math.exp(logRatio * t)
      const exact = freq * binScale
      let idx = Math.floor(exact)
      let frac = exact - idx
      if (idx < 0) {
        idx = 0
        frac = 0
      }
      else if (idx > maxIdx) {
        idx = maxIdx
        frac = 1
      }
      else if (frac < 0) frac = 0
      else if (frac > 1) frac = 1

      binIndex[i] = idx
      binFrac[i] = frac
    }

    cache = {
      barCount,
      sr,
      frequencyBinCount,
      binIndex,
      binFrac,
      prefix: new Float32Array(barCount + 1),
      avgHeights: new Float32Array(barCount),
    }
    cacheMap.set(cacheKey, cache)
  }

  // const fadeWidth = Math.min(64, w * 0.05)
  // const fadeStart = Math.max(0, w - fadeWidth)
  // // Also fade in
  // const getFadeFactor = (pos: number) => {
  //   return 1
  //   if (fadeWidth <= 0) return 1
  //   // Fade-in
  //   if (pos < fadeWidth) {
  //     const inFactor = pos / fadeWidth
  //     return inFactor < 0 ? 0 : inFactor > 1 ? 1 : inFactor
  //   }
  //   // Fade-out
  //   if (pos > fadeStart) {
  //     const outFactor = 1 - (pos - fadeStart) / fadeWidth
  //     return outFactor < 0 ? 0 : outFactor > 1 ? 1 : outFactor
  //   }
  //   return 1
  // }

  c.strokeStyle = theme.value.yellow
  c.beginPath()
  for (let i = 0; i < barCount; i++) {
    const idx = cache.binIndex[i]!
    const frac = cache.binFrac[i]!
    const value1 = magnitudes[idx]!
    const value2 = magnitudes[idx + 1]!
    const interpolatedValue = value1 + (value2 - value1) * frac

    const value = 20 * Math.log(interpolatedValue + 1e-10) * INV_LN10
    const norm = (value - minDecibels) / (maxDecibels - minDecibels)
    const clamped = norm < 0 ? 0 : norm > 1 ? 1 : norm

    const targetHeight = clamped * h
    const currentHeight = animatedHeights[i]!
    const newHeight = targetHeight > currentHeight ? targetHeight : Math.max(0, currentHeight - gravity)
    animatedHeights[i] = newHeight
    const barRight = (i + 1) * barWidth
    // const fadeFactor = getFadeFactor(barRight)
    const drawHeight = newHeight // * fadeFactor
    const bx = x + i * barWidth
    const by = y + h - drawHeight // - 5

    if (i === 0) c.moveTo(bx, by)
    else c.lineTo(bx, by)
    // c.lineTo(bx + barWidth, by)
    // c.fillRect(bx, by, Math.max(1, barWidth + 1), drawHeight)
  }
  c.lineJoin = 'round'
  c.lineCap = 'round'
  c.lineWidth = LINE_WIDTH
  c.stroke()

  // c.save()
  // c.strokeStyle = theme.value.yellow // + '88'
  // c.lineWidth = LINE_WIDTH

  // const movingAvgWindow = 8
  // const halfWin = Math.floor(movingAvgWindow / 2)
  // const prefix = cache.prefix
  // prefix[0] = 0
  // const avgHeights = cache.avgHeights
  // for (let i = 0; i < barCount; i++) {
  //   prefix[i + 1] = prefix[i]! + animatedHeights[i]!
  // }

  // for (let i = 0; i < barCount; i++) {
  //   const start = Math.max(0, i - halfWin)
  //   const end = Math.min(barCount - 1, i + halfWin)
  //   const count = end - start + 1
  //   const sum = prefix[end + 1]! - prefix[start]!
  //   avgHeights[i] = count ? sum / count : 0
  // }

  // const centerY = Math.floor(y + h / 2) // - 0.35
  // c.beginPath()
  // for (let i = 0; i < barCount; i++) {
  //   const cx = x + i * barWidth + barWidth / 2
  //   const localPos = i * barWidth + barWidth / 2
  //   const drawAvg = avgHeights[i]! * getFadeFactor(localPos)
  //   const cyTop = centerY - drawAvg / 2
  //   if (i === 0) c.moveTo(cx, cyTop)
  //   else c.lineTo(cx, cyTop)
  // }
  // c.stroke()

  // c.beginPath()
  // for (let i = 0; i < barCount; i++) {
  //   const cx = x + i * barWidth + barWidth / 2
  //   const localPos = i * barWidth + barWidth / 2
  //   const drawAvg = avgHeights[i]! * getFadeFactor(localPos)
  //   const cyBottom = centerY + drawAvg / 2
  //   if (i === 0) c.moveTo(cx, cyBottom)
  //   else c.lineTo(cx, cyBottom)
  // }
  // c.stroke()
  // c.restore()
}

type AnyGradientCtx = {
  createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => CanvasGradient
}

export function createGreyVerticalGradient(
  ctx: AnyGradientCtx,
  x: number,
  y0: number,
  y1: number,
): CanvasGradient {
  // Guard against non-finite values that cause createLinearGradient to fail
  if (!Number.isFinite(x) || !Number.isFinite(y0) || !Number.isFinite(y1)) {
    // Fallback to a default gradient if coordinates are invalid
    const grad = ctx.createLinearGradient(0, 0, 0, 100)
    grad.addColorStop(0.2, theme.value.yellow + '88')
    grad.addColorStop(0.5, theme.value.yellow)
    grad.addColorStop(0.8, theme.value.yellow + '88')
    return grad
  }

  const grad = ctx.createLinearGradient(x, y0, x, y1)
  grad.addColorStop(0.2, theme.value.yellow + '88')
  grad.addColorStop(0.5, theme.value.yellow)
  grad.addColorStop(0.8, theme.value.yellow + '88')
  return grad
}
type Offscreen2d = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type AmpCanvas = OffscreenCanvas | HTMLCanvasElement

export type AmpCanvasState = {
  canvas: AmpCanvas
  ctx: Offscreen2d
  pxW: number
  pxH: number
  dpr: number
  col: number
  bg: string
}
function drawAmplitudeScroller(
  c: CanvasRenderingContext2D,
  floats: Float32Array,
  x: number,
  y: number,
  w: number,
  h: number,
  ampCanvasArr: Array<AmpCanvasState | undefined>,
  analyserIndex: number,
  playbackState: 'stopped' | 'running' | 'paused',
  bg: string,
) {
  if (w <= 1 || h <= 1) return

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  const pxW = Math.max(1, Math.floor(w * dpr))
  const pxH = Math.max(1, Math.floor(h * dpr))

  const key = analyserIndex
  let st = ampCanvasArr[key]

  const ensureInitialized = (state: AmpCanvasState) => {
    const { canvas, ctx } = state
    canvas.width = state.pxW
    canvas.height = state.pxH
    ctx.imageSmoothingEnabled = false
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = state.bg
    ctx.fillRect(0, 0, state.pxW, state.pxH)
    const cy = (state.pxH / 2) | 0
    ctx.strokeStyle = theme.value.yellow
    ctx.lineWidth = LINE_WIDTH * dpr
    ctx.beginPath()
    ctx.moveTo(0, cy)
    ctx.lineTo(state.pxW, cy)
    ctx.stroke()
  }

  if (!st) {
    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(pxW, pxH)
      : (() => {
        const el = document.createElement('canvas')
        el.width = pxW
        el.height = pxH
        return el
      })()

    const ctx2 = canvas.getContext('2d') as Offscreen2d | null
    if (!ctx2) return

    st = { canvas, ctx: ctx2, pxW, pxH, dpr, col: pxW - 1, bg }
    ensureInitialized(st)
    ampCanvasArr[key] = st
  }
  else if (st.pxW !== pxW || st.pxH !== pxH || st.dpr !== dpr || st.bg !== bg) {
    st.pxW = pxW
    st.pxH = pxH
    st.dpr = dpr
    st.bg = bg
    st.col = Math.min(st.col, pxW - 1)
    ensureInitialized(st)
  }

  const offscreen = st.canvas
  const offCtx = st.ctx

  const N = Math.min(floats.length, 1024)
  const wide = w > 300
  const step = wide ? 3 : 1

  if (playbackState === 'running') {
    st.col = (st.col + step) % st.pxW
  }

  const cy = (st.pxH / 2) | 0
  offCtx.strokeStyle = theme.value.yellow
  offCtx.lineWidth = LINE_WIDTH * dpr

  for (let b = 0; b < step; b++) {
    const drawX = (st.col + b) % st.pxW
    const sliceStart = Math.floor((b * N) / step)
    const sliceEnd = Math.floor(((b + 1) * N) / step)
    let peak = 0
    for (let i = sliceStart; i < sliceEnd; i++) peak = Math.max(peak, Math.abs(floats[i]!))

    offCtx.fillStyle = st.bg
    offCtx.fillRect(drawX, 0, 1, st.pxH)

    offCtx.beginPath()
    offCtx.moveTo(drawX, cy)
    offCtx.lineTo(drawX + 1, cy)
    offCtx.stroke()

    const ampBarHeight = Math.max(1, Math.min(st.pxH, peak * st.pxH))
    const ampY = (st.pxH - ampBarHeight) / 2
    if (Number.isFinite(peak) && Number.isFinite(ampBarHeight) && Number.isFinite(ampY)) {
      offCtx.fillStyle = peak > 1 ? '#f00' : theme.value.yellow
      offCtx.fillRect(drawX, ampY, 1, ampBarHeight)
    }
  }

  const smoothing = c.imageSmoothingEnabled
  c.imageSmoothingEnabled = false
  const start = (st.col + step) % st.pxW
  const w1 = st.pxW - start
  const dw1 = w * (w1 / st.pxW)
  c.drawImage(offscreen as unknown as CanvasImageSource, start, 0, w1, st.pxH, x, y, dw1, h)
  if (start > 0) {
    c.drawImage(offscreen as unknown as CanvasImageSource, 0, 0, start, st.pxH, x + dw1, y, w - dw1, h)
  }
  c.imageSmoothingEnabled = smoothing
}

export function createWaveWidget(
  history: TypedHistory,
  target: TypedHistory | UserCallHistory,
  doc: Doc,
  type: 'full' | 'above',
  buffers: Map<number, WaveformBuffer>,
  animatedHeightsArrMap: Map<number, Array<Float32Array | undefined>>,
  ampCanvasArrMap: Map<number, Array<AmpCanvasState | undefined>>,
  multiplierMap: Map<number, number>,
  isPlayingThis: Signal<boolean>,
  waveBackground: Signal<string>,
  cache: Map<string, WidgetCacheEntry>,
): Widget {
  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const line = target.source.line

  const startIndex = locToIndex(doc.code, line, startCol)
  const endIndex = locToIndex(doc.code, line, endCol)
  const key = makeWidgetCacheKey('Wave', startIndex, endIndex, history.genName, type)
  const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: TypedHistory } } | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = history
    cached.widget.pos = type === 'full'
      ? { y: line }
      : { x: [startCol, endCol], y: line }
    return cached.widget
  }
  cache.delete(key)

  const historyRef = { current: history }
  const getBuffer = (idx: number) => {
    let b = buffers.get(idx)
    if (!b) {
      b = new WaveformBuffer()
      buffers.set(idx, b)
    }
    return b
  }
  const getAnimatedHeightsArr = (idx: number) => {
    let arr = animatedHeightsArrMap.get(idx)
    if (!arr) {
      arr = new Array<Float32Array | undefined>()
      animatedHeightsArrMap.set(idx, arr)
    }
    return arr
  }
  const getAmpCanvasArr = (idx: number) => {
    let arr = ampCanvasArrMap.get(idx)
    if (!arr) {
      arr = new Array<AmpCanvasState | undefined>()
      ampCanvasArrMap.set(idx, arr)
    }
    return arr
  }
  let ring: Ring | null = null
  let lastOutRing: Float32Array | null = null
  const draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const hh = historyRef.current
    const buffer = getBuffer(hh.index)
    const animatedHeightsArr = getAnimatedHeightsArr(hh.index)
    const ampCanvasArr = getAmpCanvasArr(hh.index)
    let didPaint = false
    try {
      const outRing = hh.view.getOutputRingView()
      w -= 2
      if (!outRing || !hh.view.chunkSamples) {
        return
      }
      if (!ring || lastOutRing !== outRing) {
        lastOutRing = outRing
        ring = toRing(outRing, hh.view.chunkSamples)
      }
      const floats = buffer.update(ring, hh.view.outputChunkPos)
      if (floats) {
        didPaint = true
        if (settings.analyserType === 'waveform') {
          const multiplier = multiplierMap.get(hh.index) ?? 1
          const next = drawWaveform(c, x, y, w, h, multiplier, floats, isPlayingThis.value)
          multiplierMap.set(hh.index, next)
        }
        else if (settings.analyserType === 'spectrum') {
          drawSpectrum(c, x, y, w, h, floats, animatedHeightsArr, 0, 48000, new Map())
        }
        else if (settings.analyserType === 'amplitude') {
          drawAmplitudeScroller(c, floats, x, y, w, h, ampCanvasArr, 0, isPlaying.value ? 'running' : 'stopped',
            waveBackground.value)
        }
      }
    }
    finally {
      if (!didPaint) {
        c.lineWidth = LINE_WIDTH
        c.lineCap = 'round'
        c.lineJoin = 'round'
        c.strokeStyle = theme.value.yellow
        c.beginPath()
        c.moveTo(x, y + h / 2)
        c.lineTo(x + w, y + h / 2)
        c.stroke()
      }
    }
  }

  const widget: Widget = type === 'full'
    ? { type, pos: { y: line }, draw }
    : { type, pos: { x: [startCol, endCol], y: line }, draw }
  cache.set(key, { doc, widget, historyRef })
  return widget
}
