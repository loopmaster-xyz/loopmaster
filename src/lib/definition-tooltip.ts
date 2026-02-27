import {
  activeEditor,
  type Doc,
  drawRoundedRect,
  drawText,
  type Editor as EditorType,
  measureText,
  type OverlayCanvas,
  Position,
  type Token,
  type Widget,
} from 'editor'
import { type TypedHistory, type UserCallHistory } from 'engine'
import type { DspContext, DspProgramContext, DspWidgetContext } from '../dsp.ts'
import { tokenize } from '../lib/tokenizer.ts'
import { settings } from '../settings.ts'
import {
  backgroundColor,
  ctx,
  currentProgramContext,
  grayColor,
  secondaryColor,
  textColor,
} from '../state.ts'
import { LINE_WIDTH } from '../widgets/constants.ts'
import { definitions, definitionToCode } from './definitions.ts'
import { nameToGenMap } from './gens.ts'
import { toPascalCase } from './to-pascal-case.ts'
import { withPeriod } from './with-period.ts'
const VISUAL_HEIGHT = 35
const VISUAL_SPACING = 0
const AUTCOMPLETE_GAP = 8
const AUTCOMPLETE_ITEM_HEIGHT = 20
const AUTCOMPLETE_PADDING = 8
const AUTCOMPLETE_MAX_ITEMS = 12

export const autocompleteState = {
  visible: false,
  selectedIndex: -1,
  matches: [] as string[],
  replaceStart: { line: 0, column: 0 },
  replaceEnd: { line: 0, column: 0 },
  doc: null as Doc | null,
}

function collectMatches(docCode: string, prefix: string): string[] {
  const set = new Set<string>()
  for (const name of definitions.keys()) {
    if (prefix === '' || name.startsWith(prefix)) set.add(name)
  }
  const tokenLines = tokenize(docCode)
  for (const line of tokenLines) {
    for (const t of line) {
      if ((t.type === 'identifier' || t.type === 'function') && t.text
        && (prefix === '' || t.text.startsWith(prefix)))
      {
        set.add(t.text)
      }
    }
  }
  set.delete(prefix)
  return [...set].sort()
}

function drawAutocompleteList(
  overlayCanvas: OverlayCanvas,
  anchorX: number,
  y: number,
  matches: string[],
  selectedIndex: number,
  editor: EditorType,
  leftAlignedBelow: boolean,
): number {
  if (matches.length === 0) return 0
  const { c } = overlayCanvas
  const settings = editor.settings
  const caches = createSimpleCache()
  const codeFont = `${settings.fontSize} '${settings.fontFamilyName}', monospace`
  c.font = codeFont
  let maxW = 0
  for (const m of matches) {
    const w = measureText(c, settings, caches, { text: m, type: 'identifier' }).width
    maxW = Math.max(maxW, w)
  }
  const listWidth = maxW + AUTCOMPLETE_PADDING * 2
  const visibleCount = Math.min(matches.length, AUTCOMPLETE_MAX_ITEMS)
  const listHeight = visibleCount * AUTCOMPLETE_ITEM_HEIGHT + AUTCOMPLETE_PADDING * 2
  const listY = y + settings.lineHeight
  const listX = leftAlignedBelow ? anchorX : anchorX - listWidth

  const viewport = window.visualViewport!
  const MARGIN = 4
  const left = Math.max(viewport.offsetLeft + MARGIN, listX)
  const top = Math.max(viewport.offsetTop + MARGIN, listY)
  const right = Math.min(viewport.offsetLeft + viewport.width - MARGIN, listX + listWidth)
  const bottom = Math.min(viewport.offsetTop + viewport.height - MARGIN, listY + listHeight)
  const w = right - left
  const h = bottom - top
  if (w <= 0 || h <= 0) return listWidth

  c.save()
  c.fillStyle = backgroundColor.value
  c.strokeStyle = grayColor.value
  c.lineWidth = 1.35
  drawRoundedRect(c, left, top, w, h, 6)
  c.fill()
  c.stroke()

  c.font = codeFont
  c.textBaseline = 'middle'
  for (let i = 0; i < visibleCount; i++) {
    const isSelected = selectedIndex >= 0 && (selectedIndex % matches.length + matches.length) % matches.length === i
    if (isSelected) {
      const selY = top + AUTCOMPLETE_PADDING + i * AUTCOMPLETE_ITEM_HEIGHT
      c.fillStyle = '#ffffff18'
      c.fillRect(left + 2, selY, w - 4, AUTCOMPLETE_ITEM_HEIGHT)
    }
  }
  for (let i = 0; i < visibleCount; i++) {
    const text = matches[i]!
    const itemY = top + AUTCOMPLETE_PADDING + i * AUTCOMPLETE_ITEM_HEIGHT + AUTCOMPLETE_ITEM_HEIGHT / 2
    const isSelected = selectedIndex >= 0 && (selectedIndex % matches.length + matches.length) % matches.length === i
    c.fillStyle = isSelected ? secondaryColor.value : textColor.value
    c.fillText(text, left + AUTCOMPLETE_PADDING, itemY)
  }
  c.restore()
  return listWidth
}

let tooltipWidgetCache: {
  key: string
  ref: TypedHistory | UserCallHistory
  widgets: Widget[]
} | null = null

function wrapText(
  c: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): string[] {
  c.save()
  c.font = font
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = c.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    }
    else {
      currentLine = testLine
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  c.restore()
  return lines
}

function wrapTextWithNewlines(
  c: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): { lines: string[]; justify: boolean[] } {
  const lines: string[] = []
  const justify: boolean[] = []
  for (const segment of text.split('\n')) {
    const s = segment.trim()
    const block = s ? wrapText(c, s, maxWidth, font) : ['']
    for (let i = 0; i < block.length; i++) {
      lines.push(block[i]!)
      justify.push(block.length > 1 && i < block.length - 1)
    }
  }
  return { lines, justify }
}

function drawJustifiedLine(
  c: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  width: number,
  color: string,
  justify: boolean,
): void {
  const words = line.split(' ')
  if (words.length === 0) return
  if (!justify || words.length === 1) {
    drawText(c, line, x, y, color)
    return
  }
  const totalWordsWidth = words.reduce((sum, w) => sum + c.measureText(w).width, 0)
  const gap = (width - totalWordsWidth) / (words.length - 1)
  let currentX = x
  for (let i = 0; i < words.length; i++) {
    drawText(c, words[i]!, currentX, y, color)
    currentX += c.measureText(words[i]!).width + gap
  }
}

function isSpaceToken(t: Token): boolean {
  return t.type === 'text' && /^\s*$/.test(t.text)
}

function isTokenNestedInCall(callBlock: Token[], token: Token): boolean {
  let parenDepth = 0
  let bracketDepth = 0
  let braceDepth = 0
  for (const t of callBlock) {
    if (t === token) return parenDepth > 1 || bracketDepth > 0 || braceDepth > 0
    for (let j = 0; j < t.text.length; j++) {
      const c = t.text[j]
      if (c === '(') parenDepth++
      else if (c === ')') parenDepth--
      else if (c === '[') bracketDepth++
      else if (c === ']') bracketDepth--
      else if (c === '{') braceDepth++
      else if (c === '}') braceDepth--
    }
  }
  return true
}

function isParameterDeclaredBeforeToken(callBlock: Token[], token: Token, paramName: string): boolean {
  let parenDepth = 0
  for (let i = 0; i < callBlock.length; i++) {
    const t = callBlock[i]
    if (t === token) break
    const atDepth1 = parenDepth === 1
    for (let j = 0; j < t.text.length; j++) {
      const c = t.text[j]
      if (c === '(') parenDepth++
      else if (c === ')') parenDepth--
    }
    if (atDepth1 && (t.type === 'identifier' || t.type === 'function') && t.text === paramName) {
      const next = callBlock[i + 1]
      if (next?.text === ':') return true
    }
  }
  return false
}

function wrapCodeLine(
  c: CanvasRenderingContext2D,
  settings: EditorType['settings'],
  caches: ReturnType<typeof createSimpleCache>,
  lineTokens: Token[],
  maxWidth: number,
): { tokens: Token[]; width: number }[] {
  if (lineTokens.length === 0) return []
  const segments: { tokens: Token[]; width: number }[] = []
  let current: Token[] = []
  let currentWidth = 0
  let lastSpaceIdx = -1
  for (const token of lineTokens) {
    const w = measureText(c, settings, caches, token).width
    if (currentWidth + w > maxWidth && lastSpaceIdx >= 0) {
      const breakAt = lastSpaceIdx + 1
      const head = current.slice(0, breakAt)
      const headWidth = head.reduce((sum, t) => sum + measureText(c, settings, caches, t).width, 0)
      segments.push({ tokens: head, width: headWidth })
      current = current.slice(breakAt)
      currentWidth = current.reduce((sum, t) => sum + measureText(c, settings, caches, t).width, 0)
      const idx = current.findLastIndex(t => isSpaceToken(t))
      lastSpaceIdx = idx >= 0 ? idx : -1
    }
    current.push(token)
    currentWidth += w
    if (isSpaceToken(token)) lastSpaceIdx = current.length - 1
  }
  if (current.length > 0) {
    segments.push({ tokens: current, width: currentWidth })
  }
  return segments
}

function createSimpleCache() {
  return {
    measureTextCache: new Map<string, { width: number; height: number; fontHeight: number }>(),
  } as any
}

function resolveTooltipSource(
  line: number,
  column: number,
  pascalName: string,
  definition: ReturnType<typeof definitions.get>,
  histories: TypedHistory[],
  userCallHistories: UserCallHistory[],
): { history: TypedHistory | undefined; target: TypedHistory | UserCallHistory | undefined; isUserCallSite: boolean } {
  let history: TypedHistory | undefined
  let target: TypedHistory | UserCallHistory | undefined
  let isUserCallSite = false
  if (definition) {
    history = histories.find(
      h => h.source.line === line && h.source.column === column && h.genName === pascalName,
    )
    target = history
    if (!history) {
      for (const uh of userCallHistories) {
        const lastH = uh.inner.at(-1)
        if (lastH && lastH.source.line === line && lastH.source.column === column
          && lastH.genName === pascalName)
        {
          history = lastH
          target = uh
          break
        }
      }
    }
  }
  if (!history) {
    for (const uh of userCallHistories) {
      if (uh.source.line === line && uh.source.column === column) {
        isUserCallSite = true
        target = uh
        break
      }
    }
  }
  return { history, target, isUserCallSite }
}

function isPrevCharDot(docCode: string, token: Token): boolean {
  const line = (token.line ?? 1) - 1
  const column = (token.column ?? 1) - 1
  if (column < 1) return false
  const lines = docCode.split('\n')
  const lineContent = lines[line]
  return lineContent?.[column - 1] === '.'
}

function resolveDefinitionKey(docCode: string, token: Token): string {
  if (isPrevCharDot(docCode, token)) {
    const arrayKey = `[].${token.text.toLowerCase()}`
    if (definitions.get(arrayKey)) return arrayKey
  }
  return token.text
}

function hasTooltipBody(
  token: Token,
  callBlock: Token[],
  dspContext: DspContext | null,
  programContext: DspProgramContext | null,
  inline: DspProgramContext | null,
): boolean {
  const definition = definitions.get(token.text)
  const program = inline ?? programContext
  if (definition) return true
  if (!callBlock?.length || !dspContext || !program) return false
  const parenI = callBlock.findIndex(t => t.text === '(')
  if (parenI <= 0) return false
  const callee = callBlock[parenI - 1]
  const line = callee?.line
  const column = callee?.column
  if (line == null || column == null) return false
  const pascalName: string = nameToGenMap.value.get(callee?.text ?? '')?.name || toPascalCase(callee?.text ?? '')
  const resolved = resolveTooltipSource(
    line,
    column,
    pascalName,
    definition,
    program.histories.value,
    program.userCallHistories.value,
  )
  return resolved.target !== undefined
}

export function drawDefinitionTooltip(
  overlayCanvas: OverlayCanvas,
  editor: EditorType,
  x: number,
  y: number,
  token: Token,
  parameterIndex: number = -1,
  callBlock?: Token[],
  dspContext?: DspContext | null,
  programContext?: DspProgramContext | null,
  inline?: DspProgramContext | null,
  tooltipBodyLeftX?: number,
  tokenIsDefinition?: boolean,
  caretLine?: number,
  anchorLine?: number,
  caretX?: number,
  caretY?: number,
): Position | null {
  const definition = definitions.get(token.text)
  const program = inline ?? programContext
  const effectiveParamIndex = tokenIsDefinition ? -1 : parameterIndex

  let tooltipWidgets: Widget[] = []
  const showCallWidgets = callBlock?.length && dspContext && program
  if (showCallWidgets) {
    const parenI = callBlock.findIndex(t => t.text === '(')
    if (parenI > 0) {
      const callee = callBlock[parenI - 1]
      const line = callee?.line
      const column = callee?.column
      if (line != null && column != null) {
        const pascalName: string = toPascalCase(nameToGenMap.value.get(callee?.text ?? '')?.name ?? callee?.text ?? '')
        const resolved = resolveTooltipSource(
          line,
          column,
          pascalName,
          definition,
          program.histories.value,
          program.userCallHistories.value,
        )
        const widgetContext: DspWidgetContext = program.tooltipWidgetContext
        const { history, target, isUserCallSite } = resolved
        if (target !== undefined) {
          const key = `${line}:${column}`
          const widgets = isUserCallSite && 'inner' in target
            ? (target as UserCallHistory).inner
              .map(h => dspContext.createTooltipWidget(h, target!, widgetContext))
              .filter((w): w is Widget => w != null)
            : (() => {
              const w = dspContext.createTooltipWidget(history!, target ?? history!, widgetContext)
              return w ? [w] : []
            })()
          if (
            tooltipWidgetCache?.key !== key
            || tooltipWidgetCache?.ref !== target
            || tooltipWidgetCache?.widgets.length !== widgets.length
          ) {
            tooltipWidgetCache = widgets.length ? { key, ref: target, widgets } : null
          }
          tooltipWidgets = tooltipWidgetCache?.widgets ?? []
        }
        else {
          tooltipWidgetCache = null
        }
      }
    }
  }
  else {
    tooltipWidgetCache = null
  }

  if (!definition && tooltipWidgets.length === 0) return null

  const { c } = overlayCanvas
  const settings = editor.settings
  const caches = createSimpleCache()

  const PADDING = 12
  const TOP_PADDING = 12
  const ARROW_SIZE = 6
  const MAX_WIDTH = 450
  const MARGIN = 4
  const TOOLTIP_GAP = 0
  const RADIUS = 8
  const CODE_PADDING = 12
  const CODE_PADDING_BOTTOM = 8
  const PARAGRAPH_SPACING = 8
  const CODE_SPACING = 12
  const PARAM_HIGHLIGHT_COLOR = '#ffffff22'
  const PARAM_HIGHLIGHT_PADDING = 2
  const TEXT_LINE_HEIGHT = 18
  const CODE_LINE_HEIGHT = 20

  const viewport = window.visualViewport!
  const overlayRect = overlayCanvas.rect
  const viewportLeft = viewport.offsetLeft - overlayRect.left
  const viewportTop = viewport.offsetTop - overlayRect.top
  const viewportWidth = viewport.width
  const viewportHeight = viewport.height
  const xLocal = x - overlayRect.left
  const yLocal = y - overlayRect.top
  const tooltipBodyLeftXLocal = tooltipBodyLeftX != null ? tooltipBodyLeftX - overlayRect.left : undefined
  const caretXLocal = caretX != null ? caretX - overlayRect.left : undefined
  const caretYLocal = caretY != null ? caretY - overlayRect.top : undefined

  const codeFont = `${settings.fontSize} '${settings.fontFamilyName}', monospace`
  const textFont = `400 normal 10pt 'Space Grotesk', sans-serif`
  const textFontBold = `600 normal 10pt 'Space Grotesk', sans-serif`

  c.save()
  let contentY = TOP_PADDING
  let tooltipWidth = MAX_WIDTH
  let contentWidth = MAX_WIDTH - PADDING * 2

  const code = definition ? definitionToCode(definition) : ''
  const codeLineWidth = MAX_WIDTH - PADDING * 2 - CODE_PADDING * 2
  let wrappedCodeSegments: { tokens: Token[]; width: number; isLastInLogicalLine: boolean; isOnlySegment: boolean }[] =
    []
  if (code) {
    const codeTokens = tokenize(code)
    for (const lineTokens of codeTokens) {
      const segments = wrapCodeLine(c, settings, caches, lineTokens, codeLineWidth)
      const onlySegment = segments.length === 1
      for (let i = 0; i < segments.length; i++) {
        wrappedCodeSegments.push({
          ...segments[i]!,
          isLastInLogicalLine: i === segments.length - 1,
          isOnlySegment: onlySegment,
        })
      }
    }
    contentWidth = MAX_WIDTH - PADDING * 2
    const codeBgHeight = wrappedCodeSegments.length * CODE_LINE_HEIGHT + CODE_PADDING + CODE_PADDING_BOTTOM
    contentY += codeBgHeight + CODE_SPACING
  }

  c.font = textFont
  if (definition) {
    for (const paragraph of definition.description) {
      const { lines } = wrapTextWithNewlines(c, withPeriod(paragraph), contentWidth, textFont)
      contentY += lines.length * TEXT_LINE_HEIGHT + PARAGRAPH_SPACING
    }
  }

  if (definition && effectiveParamIndex >= 0 && definition.parameters && definition.parameters[effectiveParamIndex]) {
    const param = definition.parameters[effectiveParamIndex]
    const prefix = `${param.name}: `
    c.font = textFontBold
    const prefixWidth = c.measureText(prefix).width
    c.font = textFont
    const firstParamDesc = withPeriod(param.description[0] ?? '')
    const restParamDesc = param.description.slice(1)
    const { lines: firstLines } = wrapTextWithNewlines(c, firstParamDesc, contentWidth - prefixWidth, textFont)
    contentY += firstLines.length * TEXT_LINE_HEIGHT + PARAGRAPH_SPACING
    if (!firstLines.length && restParamDesc.length) {
      contentY += TEXT_LINE_HEIGHT
    }
    for (const paragraph of restParamDesc) {
      const { lines } = wrapTextWithNewlines(c, withPeriod(paragraph), contentWidth, textFont)
      contentY += lines.length * TEXT_LINE_HEIGHT + PARAGRAPH_SPACING
    }
  }

  if (tooltipWidgets.length > 0) {
    contentY += VISUAL_SPACING + VISUAL_HEIGHT
  }

  const tooltipHeight = tooltipWidgets.length > 0
    ? contentY + PADDING
    : contentY - PARAGRAPH_SPACING + PADDING

  const tooltipYAbove = yLocal - tooltipHeight - ARROW_SIZE - TOOLTIP_GAP
  const tooltipYBelow = yLocal + settings.lineHeight + ARROW_SIZE + TOOLTIP_GAP

  const viewportTopWithMargin = viewportTop + MARGIN
  const viewportBottomWithMargin = viewportTop + viewportHeight - MARGIN

  const fitsAbove = tooltipYAbove >= viewportTopWithMargin && tooltipYAbove + tooltipHeight <= viewportBottomWithMargin
  const fitsBelow = tooltipYBelow >= viewportTopWithMargin && tooltipYBelow + tooltipHeight <= viewportBottomWithMargin
  const caretAboveAnchor = caretLine != null && anchorLine != null && caretLine < anchorLine

  const anchorX = tooltipBodyLeftXLocal ?? xLocal

  let tooltipX = anchorX
  let tooltipY: number
  let tooltipAbove: boolean
  let arrowRight: boolean

  if (caretAboveAnchor && fitsBelow) {
    tooltipAbove = false
    tooltipY = tooltipYBelow
    arrowRight = false
  }
  else if (fitsAbove) {
    tooltipAbove = true
    tooltipY = tooltipYAbove
    arrowRight = false
  }
  else if (fitsBelow) {
    tooltipAbove = false
    tooltipY = tooltipYBelow
    arrowRight = false
  }
  else {
    tooltipAbove = tooltipYAbove >= viewportTopWithMargin
    tooltipY = tooltipAbove ? tooltipYAbove : tooltipYBelow
    arrowRight = false
  }

  const xRight = anchorX
  const xLeft = anchorX - tooltipWidth
  const rightFits = xRight >= viewportLeft + MARGIN && xRight + tooltipWidth <= viewportLeft + viewportWidth - MARGIN
  const leftFits = xLeft >= viewportLeft + MARGIN && xLeft + tooltipWidth <= viewportLeft + viewportWidth - MARGIN

  function rectContainsCaret(tx: number, ty: number): boolean {
    if (caretXLocal == null || caretYLocal == null) return false
    return caretXLocal >= tx && caretXLocal <= tx + tooltipWidth && caretYLocal >= ty
      && caretYLocal <= ty + tooltipHeight
  }

  const rightCoversCaret = rectContainsCaret(xRight, tooltipY)
  const leftCoversCaret = rectContainsCaret(xLeft, tooltipY)
  if (rightCoversCaret && !leftCoversCaret) {
    tooltipX = xLeft
    arrowRight = true
  }
  else if (leftCoversCaret && !rightCoversCaret) {
    tooltipX = xRight
    arrowRight = false
  }
  else if (!rightCoversCaret && rightFits) {
    tooltipX = xRight
    arrowRight = false
  }
  else if (!leftCoversCaret && leftFits) {
    tooltipX = xLeft
    arrowRight = true
  }
  else if (rightFits) {
    tooltipX = xRight
    arrowRight = false
  }
  else if (leftFits) {
    tooltipX = xLeft
    arrowRight = true
  }

  if (!arrowRight) {
    if (tooltipX < viewportLeft + MARGIN) {
      tooltipX = viewportLeft + MARGIN
    }
    if (tooltipX + tooltipWidth > viewportLeft + viewportWidth - MARGIN) {
      tooltipX = viewportLeft + viewportWidth - tooltipWidth - MARGIN
    }
  }
  else {
    if (tooltipX + tooltipWidth > viewportLeft + viewportWidth - MARGIN) {
      tooltipX = viewportLeft + viewportWidth - tooltipWidth - MARGIN
    }
    if (tooltipX < viewportLeft + MARGIN) {
      tooltipX = viewportLeft + MARGIN
    }
  }

  const allowClipTop = tooltipAbove

  if (!allowClipTop && tooltipY < viewportTopWithMargin) {
    tooltipY = viewportTopWithMargin
  }
  if (tooltipY + tooltipHeight > viewportBottomWithMargin) {
    tooltipY = viewportBottomWithMargin - tooltipHeight
  }

  const arrowClamped = arrowRight
    ? Math.abs(anchorX - (tooltipX + tooltipWidth)) > 0.5
    : Math.abs(anchorX - tooltipX) > 0.5
  const arrowCenterX = Math.max(tooltipX + ARROW_SIZE, Math.min(anchorX, tooltipX + tooltipWidth - ARROW_SIZE))
  const position = tooltipAbove
    ? (arrowRight ? Position.TopLeft : Position.TopRight)
    : (arrowRight ? Position.BottomLeft : Position.BottomRight)

  const BG_COLOR = backgroundColor.value
  const STROKE_COLOR = grayColor.value
  c.fillStyle = BG_COLOR
  c.strokeStyle = STROKE_COLOR
  c.lineWidth = 1.35

  c.beginPath()
  if (arrowClamped) {
    if (tooltipAbove) {
      c.moveTo(tooltipX + RADIUS, tooltipY)
      c.lineTo(tooltipX + tooltipWidth - RADIUS, tooltipY)
      c.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY, tooltipX + tooltipWidth, tooltipY + RADIUS)
      c.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight - RADIUS)
      c.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX + tooltipWidth - RADIUS,
        tooltipY + tooltipHeight)
      c.lineTo(arrowCenterX + ARROW_SIZE, tooltipY + tooltipHeight)
      c.lineTo(arrowCenterX, tooltipY + tooltipHeight + ARROW_SIZE)
      c.lineTo(arrowCenterX - ARROW_SIZE, tooltipY + tooltipHeight)
      c.lineTo(tooltipX, tooltipY + tooltipHeight)
      c.lineTo(tooltipX, tooltipY + RADIUS)
      c.quadraticCurveTo(tooltipX, tooltipY, tooltipX + RADIUS, tooltipY)
      c.closePath()
    }
    else {
      c.moveTo(arrowCenterX - ARROW_SIZE, tooltipY)
      c.lineTo(arrowCenterX, tooltipY - ARROW_SIZE)
      c.lineTo(arrowCenterX + ARROW_SIZE, tooltipY)
      c.lineTo(tooltipX + tooltipWidth - RADIUS, tooltipY)
      c.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY, tooltipX + tooltipWidth, tooltipY + RADIUS)
      c.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight - RADIUS)
      c.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX + tooltipWidth - RADIUS,
        tooltipY + tooltipHeight)
      c.lineTo(tooltipX + RADIUS, tooltipY + tooltipHeight)
      c.quadraticCurveTo(tooltipX, tooltipY + tooltipHeight, tooltipX, tooltipY + tooltipHeight - RADIUS)
      c.lineTo(tooltipX, tooltipY + RADIUS)
      c.quadraticCurveTo(tooltipX, tooltipY, tooltipX + RADIUS, tooltipY)
      c.lineTo(arrowCenterX - ARROW_SIZE, tooltipY)
      c.closePath()
    }
  }
  else if (tooltipAbove) {
    c.moveTo(tooltipX + RADIUS, tooltipY)
    c.lineTo(tooltipX + tooltipWidth - RADIUS, tooltipY)
    c.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY, tooltipX + tooltipWidth, tooltipY + RADIUS)
    c.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight - RADIUS)
    if (arrowRight) {
      c.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight)
      c.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight + ARROW_SIZE)
      c.lineTo(tooltipX + tooltipWidth - ARROW_SIZE, tooltipY + tooltipHeight)
      c.lineTo(tooltipX + RADIUS, tooltipY + tooltipHeight)
      c.quadraticCurveTo(tooltipX, tooltipY + tooltipHeight, tooltipX, tooltipY + tooltipHeight - RADIUS)
    }
    else {
      c.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX + tooltipWidth - RADIUS,
        tooltipY + tooltipHeight)
      c.lineTo(tooltipX + ARROW_SIZE, tooltipY + tooltipHeight)
      c.lineTo(tooltipX, tooltipY + tooltipHeight + ARROW_SIZE)
      c.lineTo(tooltipX, tooltipY + tooltipHeight)
    }
    c.lineTo(tooltipX, tooltipY + RADIUS)
    c.quadraticCurveTo(tooltipX, tooltipY, tooltipX + RADIUS, tooltipY)
    c.closePath()
  }
  else {
    if (arrowRight) {
      c.moveTo(tooltipX + tooltipWidth - ARROW_SIZE, tooltipY)
      c.lineTo(tooltipX + tooltipWidth, tooltipY - ARROW_SIZE)
      c.lineTo(tooltipX + tooltipWidth, tooltipY)
      c.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight - RADIUS)
      c.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX + tooltipWidth - RADIUS,
        tooltipY + tooltipHeight)
      c.lineTo(tooltipX + RADIUS, tooltipY + tooltipHeight)
      c.quadraticCurveTo(tooltipX, tooltipY + tooltipHeight, tooltipX, tooltipY + tooltipHeight - RADIUS)
      c.lineTo(tooltipX, tooltipY + RADIUS)
      c.quadraticCurveTo(tooltipX, tooltipY, tooltipX + RADIUS, tooltipY)
      c.lineTo(tooltipX + tooltipWidth - ARROW_SIZE, tooltipY)
    }
    else {
      c.moveTo(tooltipX + ARROW_SIZE, tooltipY)
      c.lineTo(tooltipX, tooltipY - ARROW_SIZE)
      c.lineTo(tooltipX, tooltipY)
      c.lineTo(tooltipX, tooltipY + tooltipHeight - RADIUS)
      c.quadraticCurveTo(tooltipX, tooltipY + tooltipHeight, tooltipX + RADIUS, tooltipY + tooltipHeight)
      c.lineTo(tooltipX + tooltipWidth - RADIUS, tooltipY + tooltipHeight)
      c.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX + tooltipWidth,
        tooltipY + tooltipHeight - RADIUS)
      c.lineTo(tooltipX + tooltipWidth, tooltipY + RADIUS)
      c.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY, tooltipX + tooltipWidth - RADIUS, tooltipY)
      c.lineTo(tooltipX + ARROW_SIZE, tooltipY)
    }
    c.closePath()
  }
  c.fill()
  c.stroke()

  c.translate(tooltipX, tooltipY)

  contentY = TOP_PADDING

  if (code) {
    const codeBgHeight = wrappedCodeSegments.length * CODE_LINE_HEIGHT + CODE_PADDING + CODE_PADDING_BOTTOM

    c.fillStyle = '#ffffff11'
    drawRoundedRect(c, PADDING, contentY, contentWidth, codeBgHeight, 4)
    c.fill()

    let codeY = contentY + CODE_PADDING
    const paramHighlightRects: { x: number; y: number; width: number; height: number }[] = []
    const paramTokenHighlights = new Set<Token>()
    let parenDepth = 0
    let bracketDepth = 0
    let currentParamIndex = -1
    let inParameter = false
    let paramStartX = 0
    let paramWidth = 0
    let paramHeight = 0

    for (const segment of wrappedCodeSegments) {
      const tokens = segment.tokens
      const n = tokens.length
      const wordGapCount = !segment.isLastInLogicalLine
        ? tokens.filter((t, i) => i < n - 1 && isSpaceToken(t)).length
        : 0
      const lastIsSpace = n > 0 && isSpaceToken(tokens[n - 1]!)
      const drawnWidth = lastIsSpace
        ? segment.width - measureText(c, settings, caches, tokens[n - 1]!).width
        : segment.width
      const gapSize = wordGapCount > 0 ? (codeLineWidth - drawnWidth) / wordGapCount : 0
      const startX = segment.isLastInLogicalLine && !segment.isOnlySegment
        ? PADDING + CODE_PADDING + codeLineWidth - segment.width
        : PADDING + CODE_PADDING
      let codeX = startX

      for (let i = 0; i < n; i++) {
        const token = tokens[i]!
        if (i === n - 1 && isSpaceToken(token)) continue
        if (token.text === '(') {
          parenDepth++
          if (parenDepth === 1) {
            currentParamIndex = 0
          }
        }
        else if (token.text === ')') {
          if (inParameter && currentParamIndex === effectiveParamIndex) {
            paramHighlightRects.push({
              x: paramStartX - PARAM_HIGHLIGHT_PADDING,
              y: codeY - PARAM_HIGHLIGHT_PADDING,
              width: paramWidth + PARAM_HIGHLIGHT_PADDING * 2,
              height: paramHeight + PARAM_HIGHLIGHT_PADDING * 2,
            })
          }
          parenDepth--
          inParameter = false
        }
        else if (token.text === '[') {
          bracketDepth++
          if (parenDepth === 1 && currentParamIndex === effectiveParamIndex && !inParameter) {
            inParameter = true
            paramStartX = codeX
            paramWidth = 0
            paramHeight = 0
          }
        }
        else if (token.text === ']') {
          bracketDepth--
        }
        else if (token.text === ',' && parenDepth === 1 && bracketDepth === 0) {
          if (inParameter && currentParamIndex === effectiveParamIndex) {
            paramHighlightRects.push({
              x: paramStartX - PARAM_HIGHLIGHT_PADDING,
              y: codeY - PARAM_HIGHLIGHT_PADDING,
              width: paramWidth + PARAM_HIGHLIGHT_PADDING * 2,
              height: paramHeight + PARAM_HIGHLIGHT_PADDING * 2,
            })
          }
          inParameter = false
          currentParamIndex++
        }
        else if (parenDepth === 1 && currentParamIndex === effectiveParamIndex) {
          if (!inParameter && (token.type === 'identifier' || token.text === '...')) {
            inParameter = true
            paramStartX = codeX
            paramWidth = 0
            paramHeight = 0
          }
        }

        const metrics = measureText(c, settings, caches, token)
        if (inParameter) {
          paramWidth += metrics.width
          paramHeight = Math.max(paramHeight, metrics.height)
          paramTokenHighlights.add(token)
        }
        codeX += metrics.width
        if (i < n - 1 && isSpaceToken(token)) codeX += gapSize
      }

      if (inParameter && currentParamIndex === effectiveParamIndex) {
        paramHighlightRects.push({
          x: paramStartX - PARAM_HIGHLIGHT_PADDING,
          y: codeY - PARAM_HIGHLIGHT_PADDING,
          width: paramWidth + PARAM_HIGHLIGHT_PADDING * 2,
          height: paramHeight + PARAM_HIGHLIGHT_PADDING * 2,
        })
      }

      codeY += CODE_LINE_HEIGHT
    }

    if (effectiveParamIndex >= 0 && paramHighlightRects.length > 0) {
      c.fillStyle = PARAM_HIGHLIGHT_COLOR
      for (const rect of paramHighlightRects) {
        drawRoundedRect(c, rect.x, rect.y, rect.width, rect.height, 3)
        c.fill()
      }
    }

    codeY = contentY + CODE_PADDING
    for (const segment of wrappedCodeSegments) {
      const tokens = segment.tokens
      const n = tokens.length
      const wordGapCount = !segment.isLastInLogicalLine
        ? tokens.filter((t, i) => i < n - 1 && isSpaceToken(t)).length
        : 0
      const lastIsSpace = n > 0 && isSpaceToken(tokens[n - 1]!)
      const drawnWidth = lastIsSpace
        ? segment.width - measureText(c, settings, caches, tokens[n - 1]!).width
        : segment.width
      const gapSize = wordGapCount > 0 ? (codeLineWidth - drawnWidth) / wordGapCount : 0
      let codeX = segment.isLastInLogicalLine && !segment.isOnlySegment
        ? PADDING + CODE_PADDING + codeLineWidth - segment.width
        : PADDING + CODE_PADDING
      for (let i = 0; i < n; i++) {
        const token = tokens[i]!
        if (i === n - 1 && isSpaceToken(token)) continue
        const { color, style, weight } = settings.theme[token.type]
        const fontWeight = weight === 'bold' ? 700 : 400
        c.font = `${fontWeight} ${style} ${codeFont}`
        c.textBaseline = 'top'
        drawText(c, token.text, codeX, codeY, paramTokenHighlights.has(token) ? secondaryColor.value : color)
        const metrics = measureText(c, settings, caches, token)
        codeX += metrics.width
        if (i < n - 1 && isSpaceToken(token)) codeX += gapSize
      }
      codeY += CODE_LINE_HEIGHT
    }

    contentY += codeBgHeight + CODE_SPACING
  }

  c.font = textFont
  c.textBaseline = 'top'

  if (definition) {
    for (const paragraph of definition.description) {
      const { lines, justify } = wrapTextWithNewlines(c, withPeriod(paragraph), contentWidth, textFont)
      for (let i = 0; i < lines.length; i++) {
        drawJustifiedLine(c, lines[i]!, PADDING, contentY, contentWidth, textColor.value, justify[i]!)
        contentY += TEXT_LINE_HEIGHT
      }
      contentY += PARAGRAPH_SPACING
    }
  }

  if (definition && effectiveParamIndex >= 0 && definition.parameters && definition.parameters[effectiveParamIndex]) {
    const param = definition.parameters[effectiveParamIndex]
    const prefix = `${param.name}: `
    c.font = textFontBold
    const prefixWidth = c.measureText(prefix).width
    drawText(c, prefix, PADDING, contentY, secondaryColor.value)
    c.font = textFont
    const firstParamDesc = withPeriod(param.description[0] ?? '')
    const restParamDesc = param.description.slice(1)
    const { lines: firstLines, justify: firstJustify } = wrapTextWithNewlines(c, firstParamDesc,
      contentWidth - prefixWidth, textFont)
    const firstLineWidth = contentWidth - prefixWidth
    for (let i = 0; i < firstLines.length; i++) {
      const x = i === 0 ? PADDING + prefixWidth : PADDING
      const w = i === 0 ? firstLineWidth : contentWidth
      drawJustifiedLine(c, firstLines[i]!, x, contentY, w, textColor.value, firstJustify[i]!)
      contentY += TEXT_LINE_HEIGHT
    }
    if (!firstLines.length && restParamDesc.length) {
      contentY += TEXT_LINE_HEIGHT
    }
    contentY += PARAGRAPH_SPACING
    for (const paragraph of restParamDesc) {
      const { lines, justify } = wrapTextWithNewlines(c, withPeriod(paragraph), contentWidth, textFont)
      for (let i = 0; i < lines.length; i++) {
        drawJustifiedLine(c, lines[i]!, PADDING, contentY, contentWidth, textColor.value, justify[i]!)
        contentY += TEXT_LINE_HEIGHT
      }
      contentY += PARAGRAPH_SPACING
    }
  }

  if (tooltipWidgets.length > 0) {
    contentY += VISUAL_SPACING
    const padding = LINE_WIDTH * 2
    const n = tooltipWidgets.length
    const gap = n > 1 ? 2 : 0
    const segmentWidth = (contentWidth - (n - 1) * gap) / n
    const widgetDraw = (w: Widget) =>
      (w.draw as (
        c: CanvasRenderingContext2D,
        x: number,
        y: number,
        wd: number,
        h: number,
        fw?: number,
        contentLeft?: number,
      ) => void)(
        c,
        padding,
        padding,
        segmentWidth - padding * 2,
        VISUAL_HEIGHT - padding * 2,
        segmentWidth - padding * 2,
        padding,
      )
    for (let i = 0; i < n; i++) {
      c.save()
      c.translate(PADDING + i * (segmentWidth + gap), contentY)
      c.beginPath()
      c.rect(0, 0, segmentWidth, VISUAL_HEIGHT)
      c.clip()
      widgetDraw(tooltipWidgets[i]!)
      c.restore()
    }
  }

  c.restore()

  return position
}

export type DefinitionTooltipHandler = (
  canvas: unknown,
  x: number,
  y: number,
  token: Token,
  callBlock: Token[],
  parameterIndex: number,
  callBlockX: number,
  callBlockY: number,
  doc: Doc,
  paramX?: number,
  paramY?: number,
  caretX?: number,
  caretY?: number,
) => Position | null

export function createDefinitionTooltipHandlers(
  editor: EditorType,
  getInline?: () => DspProgramContext | null | undefined,
): { onHoverToken: DefinitionTooltipHandler; onCaretToken: DefinitionTooltipHandler } {
  const drawBody = (
    canvas: unknown,
    ed: EditorType,
    x: number,
    y: number,
    token: Token,
    callBlock: Token[],
    parameterIndex: number,
    callBlockX: number,
    callBlockY: number,
    dspContext: DspContext | null,
    programContext: DspProgramContext | null,
    inline: DspProgramContext | null,
    tooltipBodyLeftX?: number,
    tokenIsDefinition?: boolean,
    caretLine?: number,
    anchorLine?: number,
    caretX?: number,
    caretY?: number,
  ) => {
    return drawDefinitionTooltip(
      canvas as OverlayCanvas,
      ed,
      x,
      y,
      token,
      parameterIndex,
      callBlock,
      dspContext,
      programContext,
      inline,
      tooltipBodyLeftX,
      tokenIsDefinition,
      caretLine,
      anchorLine,
      caretX,
      caretY,
    )
  }

  const resolveAndDraw = (
    canvas: unknown,
    x: number,
    y: number,
    token: Token,
    callBlock: Token[],
    parameterIndex: number,
    callBlockX: number,
    callBlockY: number,
    doc: Doc,
    paramX?: number,
    paramY?: number,
    bodyLeftX?: number,
    caretLine?: number,
    caretX?: number,
    caretY?: number,
  ): Position | null => {
    const isFunctionCall = callBlock.length > 0
    const resolvedKey = resolveDefinitionKey(doc.code, token)
    const tokenDef = definitions.get(resolvedKey)
    let definitionKey: string | null = null
    if (tokenDef) definitionKey = resolvedKey
    else if (isFunctionCall) definitionKey = resolveDefinitionKey(doc.code, callBlock[0]!)
    if (!definitionKey) definitionKey = resolvedKey
    const tokenWithKey = { ...token, text: definitionKey }
    const definition = definitions.get(definitionKey)
    let resolvedParamIndex = tokenDef ? -1 : parameterIndex
    if (!tokenDef && definition?.parameters && isFunctionCall && parameterIndex >= 0
      && !isTokenNestedInCall(callBlock, token))
    {
      const exact = definition.parameters.findIndex(p => p.name === token.text)
      if (exact >= 0) {
        const param = definition.parameters[exact]
        if (!isParameterDeclaredBeforeToken(callBlock, token, param!.name)) resolvedParamIndex = exact
      }
      else {
        const labelMatch = definition.parameters.findIndex(p => p.name.startsWith(token.text))
        if (labelMatch >= 0) {
          const param = definition.parameters[labelMatch]
          if (!isParameterDeclaredBeforeToken(callBlock, token, param!.name)) resolvedParamIndex = labelMatch
        }
      }
    }
    const dspContext = ctx.value
    const programContext = currentProgramContext.value
    const inline = getInline?.() ?? null
    const tooltipX = tokenDef ? x : resolvedParamIndex >= 0 ? (paramX ?? x) : callBlockX
    const tooltipY = tokenDef ? y : resolvedParamIndex >= 0 ? (paramY ?? y) : callBlockY
    const tokenAnchorLine = (token.line ?? 1) - 1
    const parenI = callBlock.findIndex((t: Token) => t.text === '(')
    const callCallee = parenI > 0 ? callBlock[parenI - 1] : null
    const callAnchorLine = (callCallee?.line ?? callBlock[0]?.line ?? 1) - 1
    if (definition) {
      const useCallBlock = !tokenDef
      if (definition.type === 'function' && isFunctionCall && useCallBlock) {
        return drawBody(canvas, editor, tooltipX, tooltipY, tokenWithKey, callBlock, resolvedParamIndex, callBlockX,
          callBlockY, dspContext, programContext, inline, bodyLeftX, false, caretLine, callAnchorLine, caretX, caretY)
      }
      return drawBody(canvas, editor, x, y, tokenWithKey, isFunctionCall ? callBlock : [], resolvedParamIndex,
        callBlockX, callBlockY, dspContext, programContext, inline, bodyLeftX, !!tokenDef, caretLine, tokenAnchorLine,
        caretX, caretY)
    }
    if (isFunctionCall && callBlock.length && dspContext) {
      return drawBody(canvas, editor, callBlockX, callBlockY, tokenWithKey, callBlock, -1, callBlockX, callBlockY,
        dspContext, programContext, inline, bodyLeftX, false, caretLine, callAnchorLine, caretX, caretY)
    }
    return null
  }

  const onHoverToken: DefinitionTooltipHandler = (canvas, x, y, token, callBlock, parameterIndex, callBlockX,
    callBlockY, _doc, paramX, paramY, caretX, caretY) =>
  {
    if (!settings.showDocs) return null
    return resolveAndDraw(canvas, x, y, token, callBlock, parameterIndex, callBlockX, callBlockY, _doc, paramX, paramY,
      undefined, activeEditor.value?.caret.line.value, caretX, caretY)
  }

  const onCaretToken: DefinitionTooltipHandler = (canvas, x, y, token, callBlock, parameterIndex, callBlockX,
    callBlockY, doc, _paramX, _paramY, caretX, caretY) =>
  {
    if (!settings.showDocs) {
      autocompleteState.visible = false
      return null
    }
    const matches = collectMatches(doc.code, token.text)
    if (matches.length === 0) {
      autocompleteState.visible = false
      return resolveAndDraw(canvas, x, y, token, callBlock, parameterIndex, callBlockX, callBlockY, doc, undefined,
        undefined, undefined, activeEditor.value?.caret.line.value, undefined, undefined)
    }
    const line = (token.line ?? 1) - 1
    const column = (token.column ?? 1) - 1
    if (!autocompleteState.visible) autocompleteState.selectedIndex = -1
    autocompleteState.visible = true
    autocompleteState.matches = matches
    autocompleteState.replaceStart = { line, column }
    autocompleteState.replaceEnd = { line, column: column + token.text.length }
    autocompleteState.doc = doc

    const isFunctionCall = callBlock.length > 0
    const calleeToken = isFunctionCall ? callBlock[0] : token
    const definitionKey = resolveDefinitionKey(doc.code, calleeToken)
    const tokenWithKey = { ...token, text: definitionKey }
    const dspContext = ctx.value
    const programContext = currentProgramContext.value
    const inline = getInline?.() ?? null
    const hasBody = hasTooltipBody(tokenWithKey, callBlock, dspContext, programContext, inline)

    const overlayCanvas = canvas as unknown as OverlayCanvas
    drawAutocompleteList(overlayCanvas, x - (hasBody ? AUTCOMPLETE_GAP : 0), y, matches,
      autocompleteState.selectedIndex, editor, !hasBody)
    const bodyLeftX = hasBody ? x : undefined
    const drew = resolveAndDraw(canvas, x, y, token, callBlock, parameterIndex, callBlockX, callBlockY, doc, undefined,
      undefined, bodyLeftX, activeEditor.value?.caret.line.value, caretX, caretY)
    if (drew == null) {
      autocompleteState.visible = true
    }
    return drew ?? Position.BottomLeft
  }

  return { onHoverToken, onCaretToken }
}
