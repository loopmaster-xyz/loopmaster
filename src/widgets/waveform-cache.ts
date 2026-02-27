import { theme } from '../state.ts'
import { clamp11 } from './util.ts'

const LINE_WIDTH = 1.35

export type WaveformCache = {
  canvas: OffscreenCanvas
  ctx: OffscreenCanvasRenderingContext2D
  channelsRef: Float32Array[] | null
  width: number
  dpr: number
  color: string
}

function channelRefEqual(a: Float32Array, b: Float32Array): boolean {
  return a.buffer === b.buffer && a.byteOffset === b.byteOffset && a.length === b.length
}

function channelsEqual(a: Float32Array[] | null, b: Float32Array[] | null): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (!channelRefEqual(a[i], b[i])) return false
  return true
}

export function drawWaveformToCache(
  ctx: OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  channels: Float32Array[],
  color: string,
) {
  const ch0 = channels[0]
  if (!ch0 || ch0.length < 2) return
  const len = ch0.length
  const mid = h / 2
  const amp = (h / 2) - 2
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.strokeStyle = color
  ctx.lineWidth = LINE_WIDTH
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const step = w > 100 ? .1 : .05
  for (let i = 0; i < w; i += step) {
    const j = Math.floor((i / w) * len)
    const value = ch0[j] ?? 0
    const sy = mid - clamp11(value) * amp
    if (i === 0) ctx.moveTo(i, sy)
    else ctx.lineTo(i, sy)
  }
  ctx.stroke()
}

export function updateWaveformCache(
  cache: WaveformCache | null,
  w: number,
  h: number,
  dpr: number,
  channels: Float32Array[] | null,
): WaveformCache | null {
  const iw = Math.max(1, Math.round(w * dpr))
  const ih = Math.max(1, Math.round(h * dpr))
  if (iw <= 0 || ih <= 0) return cache
  const cacheInvalid = !cache
    || cache.width !== iw
    || cache.dpr !== dpr
    || cache.color !== theme.value.yellow
    || (channels != null && !channelsEqual(cache.channelsRef, channels))
  if (!cacheInvalid) return cache
  if (!cache || cache.canvas.width !== iw || cache.canvas.height !== ih) {
    const canvas = new OffscreenCanvas(iw, ih)
    cache = {
      canvas,
      ctx: canvas.getContext('2d')!,
      channelsRef: null,
      width: iw,
      dpr,
      color: theme.value.yellow,
    }
  }
  cache.channelsRef = channels
  cache.width = iw
  cache.dpr = dpr
  cache.color = theme.value.yellow
  cache.ctx.setTransform(1, 0, 0, 1, 0, 0)
  cache.ctx.clearRect(0, 0, iw, ih)
  if (channels?.length) {
    drawWaveformToCache(cache.ctx, w, h, dpr, channels, cache.color)
  }
  return cache
}
