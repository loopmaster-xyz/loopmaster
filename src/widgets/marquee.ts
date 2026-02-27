import type { Signal } from '@preact/signals'
import { type Doc, drawText, type Widget } from 'editor'
import {
  createHistoryReader,
  type DspLatency,
  type EmitHistory,
  type TypedHistory,
  type UserCallHistory,
} from 'engine'
import { grayColor } from '../state.ts'
import { getFunctionCallLength } from './util.ts'

export function createMarqueeWidget(
  history: EmitHistory,
  target: TypedHistory | UserCallHistory,
  doc: Doc,
  latency: Signal<DspLatency>,
  mapFn: (value: number) => string,
): Widget {
  const startCol = target.source.column
  const endCol = startCol + getFunctionCallLength(doc.code, target.source.line, target.source.column)
  const line = target.source.line

  const reader = createHistoryReader(
    history.size,
    history.mask,
    {
      value: 0,
    },
    () => {},
    () => latency.value.state,
    () => history.writeIndex,
    index => history.sampleCounts[index],
    (state, index) => {
      state.value = history.params.value.at(index)
    },
  )

  const past: number[] = []
  let scrollX = 0
  const lerpFactor = 0.2

  let epoch = -1
  return {
    type: 'above',
    pos: { x: [startCol, endCol], y: line },
    draw: (c, x, y, w, h) => {
      reader.run(++epoch)
      c.font = '12px "Liga Space Mono"'
      const v = reader.state.value
      if (past.at(-1) !== v) {
        past.push(v)
        if (past.length > 10) {
          const removedWidth = c.measureText(mapFn(past[0]!) + ' ').width
          past.shift()
          scrollX = Math.max(0, scrollX - removedWidth)
        }
      }
      const text = past.map(mapFn).join(' ')
      const textWidth = c.measureText(text).width
      const targetScroll = Math.max(0, textWidth - w)
      scrollX += (targetScroll - scrollX) * lerpFactor
      c.save()
      c.translate(x, y)
      c.rect(0, 0, w, h)
      c.clip()
      c.translate(-scrollX, 0)
      c.textAlign = 'left'
      drawText(c, text, 0, h, grayColor.value)
      c.restore()
    },
  }
}
