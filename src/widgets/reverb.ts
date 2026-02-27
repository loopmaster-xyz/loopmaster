import { type Signal } from '@preact/signals'
import type { Doc, Widget } from 'editor'
import {
  createHistoryReader,
  type DattorroHistory,
  type DspLatency,
  type FdnHistory,
  type FreeverbHistory,
  type TypedHistory,
  type UserCallHistory,
  type VelvetHistory,
} from 'engine'
import { locToIndex } from '../lib/index-loc.ts'
import { primaryColor } from '../state.ts'
import { makeWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { LINE_WIDTH } from './constants.ts'
import { clamp, getFunctionCallLength } from './util.ts'

type ReverbHistory = DattorroHistory | FreeverbHistory | FdnHistory | VelvetHistory

export function createReverbWidget(
  reverb: ReverbHistory,
  target: TypedHistory | UserCallHistory,
  doc: Doc,
  latency: Signal<DspLatency>,
  cache: Map<string, WidgetCacheEntry>,
): Widget {
  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const line = target.source.line

  const startIndex = locToIndex(doc.code, line, startCol)
  const endIndex = locToIndex(doc.code, line, endCol)
  const key = makeWidgetCacheKey('Reverb', startIndex, endIndex, reverb.genName)
  const cached = cache.get(key) as { doc: Doc; widget: Widget; historyRef: { current: ReverbHistory } } | undefined
  if (cached?.doc === doc) {
    cached.historyRef.current = reverb
    cached.widget.pos = { x: [startCol, endCol], y: line }
    return cached.widget
  }
  cache.delete(key)

  const historyRef = { current: reverb }
  const reader = createHistoryReader(
    reverb.size,
    reverb.mask,
    {
      room: 0,
    },
    () => {},
    () => latency.value.state,
    () => historyRef.current.writeIndex,
    index => historyRef.current.sampleCounts[index],
    (state, index) => {
      state.room = historyRef.current.params.room.at(index)
    },
  )

  let epoch = 0

  const draw = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    reader.run(++epoch)

    const room = Math.tanh(clamp(reader.state.room, 0.05, 1.0) * 1.75)

    c.save()
    c.translate(x, y)

    const primary = primaryColor.value
    const pad = 0
    const c30 = 0.8660254037844386
    const s30 = 0.35

    const dxCoef = 0.68
    const dzCoef = 0.48
    const dyCoef = 0.48
    const sumCoef = dxCoef + dzCoef

    const maxSx = (w - pad * 2) / Math.max(1e-6, c30 * sumCoef)
    const maxSy = (h - pad * 2) / Math.max(1e-6, dyCoef + s30 * sumCoef)
    const maxS = Math.min(maxSx, maxSy)
    const s = Math.max(0, room * (maxS - 6)) + 6

    const ox = w / 2
    const dx = s * dxCoef
    const dz = s * dzCoef
    const dy = s * dyCoef
    const oyMin = pad + dy
    const oyMax = h - pad - s30 * (dx + dz)
    const oy = oyMin + (oyMax - oyMin) * 0.5

    const proj = (xx: number, yy: number, zz: number) => {
      const px = ox + xx * c30 - zz * c30
      const py = oy + xx * s30 + zz * s30 - yy
      return [px, py] as const
    }

    const A = proj(0, 0, 0)
    const B = proj(dx, 0, 0)
    const Cc = proj(dx, 0, dz)
    const D = proj(0, 0, dz)
    const A2 = proj(0, dy, 0)
    const B2 = proj(dx, dy, 0)
    const C2 = proj(dx, dy, dz)
    const D2 = proj(0, dy, dz)

    c.lineWidth = LINE_WIDTH

    c.save()
    c.fillStyle = primary
    c.globalAlpha = 0.15

    c.beginPath()
    c.moveTo(A[0], A[1])
    c.lineTo(B[0], B[1])
    c.lineTo(Cc[0], Cc[1])
    c.lineTo(D[0], D[1])
    c.closePath()
    c.fill()

    c.beginPath()
    c.moveTo(A[0], A[1])
    c.lineTo(D[0], D[1])
    c.lineTo(D2[0], D2[1])
    c.lineTo(A2[0], A2[1])
    c.closePath()
    c.fill()

    c.beginPath()
    c.moveTo(A[0], A[1])
    c.lineTo(B[0], B[1])
    c.lineTo(B2[0], B2[1])
    c.lineTo(A2[0], A2[1])
    c.closePath()
    c.fill()

    c.beginPath()
    c.moveTo(D[0], D[1])
    c.lineTo(Cc[0], Cc[1])
    c.lineTo(C2[0], C2[1])
    c.lineTo(D2[0], D2[1])
    c.closePath()
    c.fill()

    c.beginPath()
    c.lineTo(B[0], B[1])
    c.lineTo(Cc[0], Cc[1])
    c.lineTo(C2[0], C2[1])
    c.lineTo(B2[0], B2[1])
    c.closePath()
    c.fill()

    c.restore()

    c.strokeStyle = primary
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(A[0], A[1])
    c.lineTo(B[0], B[1])
    c.lineTo(Cc[0], Cc[1])
    c.lineTo(D[0], D[1])
    c.closePath()
    c.moveTo(A[0], A[1])
    c.lineTo(A2[0], A2[1])
    c.moveTo(B[0], B[1])
    c.lineTo(B2[0], B2[1])
    c.moveTo(D[0], D[1])
    c.lineTo(D2[0], D2[1])
    c.moveTo(Cc[0], Cc[1])
    c.lineTo(C2[0], C2[1])
    c.moveTo(A2[0], A2[1])
    c.lineTo(B2[0], B2[1])
    c.lineTo(C2[0], C2[1])
    c.lineTo(D2[0], D2[1])
    c.closePath()
    // c.stroke()

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
