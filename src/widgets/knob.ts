import type { Doc, Widget } from 'editor'
import { type ControlCompileSnapshot, type Expr, type GenDescriptor, type GenParameter, gens } from 'engine'
import { indexToLoc } from '../lib/index-loc.ts'
import { primaryColor, secondaryColor, skipSyncPreview } from '../state.ts'
import { makeWidgetCacheKey, parseWidgetCacheKey } from './cache-key.ts'
import type { WidgetCacheEntry } from './cache.ts'
import { clamp01 } from './util.ts'

const LINE_WIDTH = 1.25

function parseValueFromText(t: string): { value: number; hasK: boolean } {
  const s = t.trimEnd()
  const hasK = s.toLowerCase().endsWith('k')
  const numPart = hasK ? s.slice(0, -1) : s
  const n = parseFloat(numPart)
  return { value: Number.isNaN(n) ? 0 : hasK ? n * 1000 : n, hasK }
}

export function createKnobWidgets(doc: Doc, result: ControlCompileSnapshot | null,
  cache: Map<string, WidgetCacheEntry>): Widget[]
{
  if (!result) return []

  const src = doc.code
  const preludeLen = result.lex.preludeLen

  const calls = result.compile.functionCalls
  const numbers = result.parse.numberLiterals
  const widgets: Widget[] = []

  const knobs: Map<Expr & { type: 'number' }, Widget> = new Map()

  const createKnob = (value: Expr & { type: 'number' }, param?: GenParameter) => {
    if (knobs.has(value)) return
    if (value.value === 0) return

    const startIndex = value.loc.start - preludeLen
    const endIndex = value.loc.end - preludeLen
    const literalText = src.slice(startIndex, endIndex).trim()
    if (literalText === 'true' || literalText === 'false') return

    const { line: startLine, column: startColumn } = indexToLoc(src, startIndex)
    const { line: endLine, column: endColumn } = indexToLoc(src, endIndex)
    const key = makeWidgetCacheKey('Knob', startIndex, endIndex)
    const cached = cache.get(key) as
      | { doc: Doc; widget: Widget; value: Expr & { type: 'number' }; preludeLen: number }
      | undefined
    if (cached?.doc === doc) {
      cached.value = value
      cached.preludeLen = preludeLen
      cached.widget.pos = { x: startColumn, y: startLine, width: 18 }
      knobs.set(value, cached.widget)
      return
    }
    else {
      cache.delete(key)
    }

    let initialNormal: number
    let normal: number

    let digitsAfterDecimal: number
    let scale = 1
    let min = 0

    let text: string
    let hasK = false
    let hasLeadingZero = true

    const entryRef: { doc: Doc; widget: Widget; value: Expr & { type: 'number' }; preludeLen: number } = {
      doc,
      widget: null!,
      value,
      preludeLen,
    }

    const getStartIndex = () => {
      for (const [cacheKey, cacheEntry] of cache) {
        if (cacheEntry === entryRef) {
          const parsed = parseWidgetCacheKey(cacheKey)
          if (parsed) {
            return parsed.start
          }
        }
      }
      const { value: v, preludeLen: plen } = entryRef
      return v.loc.start - plen
    }

    const getRange = () => {
      const { value: v } = entryRef
      const baseLen = v.loc.end - v.loc.start
      const start = getStartIndex()
      return { start, end: start + baseLen }
    }

    const syncFromDoc = () => {
      const src = doc.code
      const { start, end } = getRange()
      text = src.slice(start, end)
      const { value: parsedVal, hasK: k } = parseValueFromText(text)
      hasK = k
      const numPart = hasK ? text.trimEnd().slice(0, -1) : text
      const numPartAbs = numPart.replace(/^-/, '')
      hasLeadingZero = numPartAbs.startsWith('0.')
      const digitsSplit = numPartAbs.split('.')
      const digitsBeforeDecimal = digitsSplit[0]?.length ?? 0
      digitsAfterDecimal = digitsSplit[1]?.length ?? 0
      const firstSignificantPosition = digitsSplit[1]?.indexOf(digitsSplit[1]?.match(/[1-9]/)?.[0] ?? '') ?? 0

      const literalVal = entryRef.value.value
      const valForScale = hasK ? parsedVal / 1000 : (parsedVal || literalVal)
      if (valForScale >= 1) {
        scale = parseFloat('0.9e' + digitsBeforeDecimal) - 1
        min = parseFloat('0.1e' + digitsBeforeDecimal)
      }
      else if (valForScale <= -1) {
        min = -(10 ** digitsBeforeDecimal - 1)
        const maxNeg = -(10 ** (digitsBeforeDecimal - 1))
        scale = maxNeg - min
      }
      else {
        scale = parseFloat('0.9e-' + firstSignificantPosition) - parseFloat('0.1e-' + (digitsAfterDecimal - 1))
        min = valForScale < 0
          ? -parseFloat('0.9e-' + firstSignificantPosition)
          : parseFloat('0.1e-' + firstSignificantPosition)
      }
      normal = (valForScale - min) / scale
      normal = Math.max(0, Math.min(1, normal))
      return normal
    }

    const adjust = () => {
      syncFromDoc()
      initialNormal = normal
    }

    adjust()
    // }

    const knob: Widget = {
      type: 'before',
      pos: { x: startColumn, y: startLine, width: 18 },
      draw: (c, x, y, w, h) => {
        syncFromDoc()

        w -= 2
        h -= 2
        x += 0.5
        y += 0.5

        const cx = x + w / 2
        const cy = y + h / 2
        const r = w / 2.6
        c.save()
        c.lineWidth = LINE_WIDTH
        c.beginPath()
        c.arc(cx, cy, r, 0, Math.PI * 2)
        c.fill()

        const a0 = Math.PI * 0.75
        const a1 = Math.PI * 2.25
        const a = a0 + (a1 - a0) * normal

        c.strokeStyle = 'rgba(140,140,140,0.5)'
        c.beginPath()
        c.arc(cx, cy, r, a0, a1)
        c.stroke()

        c.strokeStyle = primaryColor.value
        c.beginPath()
        c.arc(cx, cy, r, a0, a)
        c.stroke()

        c.fillStyle = secondaryColor.value
        c.beginPath()
        c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.1, 0, Math.PI * 2)
        c.fill()

        c.restore()
      },
      onMouseDown(event) {
        const y = event.clientY

        const handleMove = (e: MouseEvent) => {
          skipSyncPreview(doc)
          const { start, end } = getRange()
          const len = end - start
          const dy = (y - e.clientY) * 0.008
          const vn = clamp01(initialNormal + dy)
          const val = vn * scale + min
          let f: string
          f = val.toFixed(digitsAfterDecimal)
          if (!hasLeadingZero && (f.startsWith('0.') || f.startsWith('-0.'))) f = f.replace(/^(-?)0\./, '$1.')
          if (hasK) f += 'k'

          const index = start

          if (f !== text) {
            doc.replace(index, len, f)
            text = f
            normal = vn
          }
        }
        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', () => {
          entryRef.value.value = min + normal * scale
          adjust()
          entryRef.value.value = min + normal * scale
          window.removeEventListener('pointermove', handleMove)
        }, { once: true })
      },
    }
    entryRef.widget = knob
    knobs.set(value, knob)
    cache.set(key, entryRef)
  }

  const traverse = (gen: GenDescriptor, exprs: Expr[], param?: GenParameter) => {
    for (const expr of exprs) {
      if (expr.type === 'number') {
        createKnob(expr, param)
      }
      else if (expr.type === 'binary') {
        if (expr.op === '**') {
          traverse(gen, [expr.left], param)
        }
        else {
          traverse(gen, [expr.left, expr.right], param)
        }
      }
      else if (expr.type === 'call') {
        traverse(gen, Array.from(expr.args.values()).map(x => x.value), param)
      }
    }
  }

  for (const call of calls) {
    const gen = gens[call.name]
    if (!gen) continue

    for (const name in call.args) {
      const param = gen.parameters.find(p => p.name === name)
      if (param) {
        traverse(gen, call.args[name], param)
      }
    }
  }

  for (const number of numbers) {
    createKnob(number)
  }

  for (const knob of knobs.values()) {
    widgets.push(knob)
  }

  return widgets
}
