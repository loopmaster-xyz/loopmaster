import type { Header } from 'editor'
import {
  compileTimelineNotation,
  getTimelineValueAtSample,
  readTimelineSegsFromCompiledTimeline,
} from 'engine'
import { MouseButton } from 'utils/mouse-buttons'
import type { DspContext, DspProgramContext } from '../dsp.ts'
import {
  bpmOverride,
  getTimelineColor,
  primaryColor,
  secondaryColor,
  theme,
  transport,
} from '../state.ts'
import {
  BEATS_PER_BAR,
  DEFAULT_BARS,
  FUTURE_BARS,
  HEADER_PADDING_LEFT,
  LABEL_PADDING,
  MINIMAP_MAJOR_STEP,
  MINIMAP_MINOR_STEP,
  PAST_BARS,
  TIME_WINDOW_BARS,
} from './constants.ts'
import { clamp01 } from './util.ts'

export type HeaderTransport = Pick<
  typeof transport,
  | 'restart'
  | 'beginSeek'
  | 'endSeek'
  | 'seek'
  | 'getLoopBeginSamples'
  | 'getLoopEndSamples'
  | 'setLoopBeginSamples'
  | 'setLoopEndSamples'
>

export type CreateHeaderOpts = {
  transport?: HeaderTransport
  setTargetSeconds?: (seconds: number) => void
}

export const createHeader = (
  rootCtx: DspContext | null,
  programCtx: DspProgramContext | null,
  opts: CreateHeaderOpts = {},
): Header => {
  const t = opts.transport ?? transport
  const setTargetSeconds = opts.setTargetSeconds ?? ((seconds: number) => {
    if (!rootCtx) return
    rootCtx.targetSeconds.value = seconds
  })
  return {
    height: 48,
    onMouseDown: (e, x, y, w, h) => {
      if (!rootCtx || !programCtx?.result.value) return
      x -= HEADER_PADDING_LEFT
      w -= HEADER_PADDING_LEFT
      let ratio = x / w
      if (e.altKey) {
        const bpm = bpmOverride.value || (programCtx.result.value.compile.bpm ?? 120)
        const barLengthSeconds = (BEATS_PER_BAR * 60) / bpm
        const sampleRate = programCtx.latency.value.state.sampleRate || 44100
        const secToSamples = (sec: number) => Math.round(sec * sampleRate)
        if (y < h / 2) {
          const barIndex = ratio * DEFAULT_BARS
          const phraseBar = Math.floor(barIndex / 4) * 4
          const begin = secToSamples(phraseBar * barLengthSeconds)
          const end = secToSamples((phraseBar + 4) * barLengthSeconds)
          if (begin === t.getLoopBeginSamples() && end === t.getLoopEndSamples()) {
            t.setLoopBeginSamples(0)
            t.setLoopEndSamples(0)
          }
          else {
            t.setLoopBeginSamples(begin)
            t.setLoopEndSamples(end)
          }
        }
        else {
          const timeSeconds = programCtx.timeSeconds.value
          const windowStartTime = timeSeconds - PAST_BARS * barLengthSeconds
          const timeWindowSeconds = TIME_WINDOW_BARS * barLengthSeconds
          const clickedSeconds = windowStartTime + ratio * timeWindowSeconds
          const barIndex = Math.floor(clickedSeconds / barLengthSeconds)
          const barStartSeconds = barIndex * barLengthSeconds
          const begin = secToSamples(barStartSeconds)
          const end = secToSamples(barStartSeconds + barLengthSeconds)
          if (begin === t.getLoopBeginSamples() && end === t.getLoopEndSamples()) {
            t.setLoopBeginSamples(0)
            t.setLoopEndSamples(0)
          }
          else {
            t.setLoopBeginSamples(begin)
            t.setLoopEndSamples(end)
          }
        }
        return
      }
      if (ratio < 0 || e.button === MouseButton.Right) {
        t.restart()
        return
      }
      const half = h / 2
      const dx = e.clientX - x
      if (y < half) {
        t.beginSeek()
        const seek = () => {
          const bpm = bpmOverride.value || (programCtx.result.value!.compile.bpm ?? 120)
          const seconds = ratio * DEFAULT_BARS * BEATS_PER_BAR * 60 / bpm
          const beatLengthSeconds = 60 / bpm / 4
          const snappedSeconds = Math.max(0, Math.round(seconds / beatLengthSeconds) * beatLengthSeconds)
          t.seek(snappedSeconds)
          setTargetSeconds(seconds)
        }
        seek()
        const handleMove = (e: MouseEvent) => {
          const x = e.clientX - dx
          ratio = clamp01(x / w)
          seek()
        }
        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', () => {
          t.endSeek()
          window.removeEventListener('mousemove', handleMove)
        }, { once: true })
      }
      else {
        t.beginSeek()
        let currentSeconds = programCtx.latency.value.state.timeSeconds ?? 0
        const seek = (delta: number) => {
          const seconds = Math.max(0, currentSeconds + delta * 0.015)
          t.seek(seconds)
          currentSeconds = seconds
          setTargetSeconds(seconds)
        }
        const handleMove = (e: MouseEvent) => {
          const cx = e.clientX - dx
          seek(x - cx)
          x = cx
        }
        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', () => {
          t.endSeek()
          window.removeEventListener('mousemove', handleMove)
        }, { once: true })
      }
    },
    draw: (c, x, y, w, h) => {
      c.save()
      c.translate(x, y)
      c.fillStyle = theme.value.black + 'dd'
      c.fillRect(x, y, w, h)
      c.restore()
      if (!programCtx?.result?.value) return

      x += HEADER_PADDING_LEFT
      w -= HEADER_PADDING_LEFT

      const timeSeconds = programCtx.timeSeconds
      const bpm = bpmOverride.value || (programCtx.result.value.compile.bpm ?? 120)
      const barLengthSeconds = (BEATS_PER_BAR * 60) / bpm
      const windowStartTime = timeSeconds.value - PAST_BARS * barLengthSeconds
      const windowEndTime = timeSeconds.value + FUTURE_BARS * barLengthSeconds
      const timeWindowSeconds = TIME_WINDOW_BARS * barLengthSeconds
      const pxPerSecond = w / timeWindowSeconds
      const playheadX = PAST_BARS * barLengthSeconds * pxPerSecond

      const barCount = Math.max(1, Math.floor(DEFAULT_BARS))
      const totalSeconds = barLengthSeconds * barCount

      c.save()

      c.translate(x, y)
      c.beginPath()
      c.rect(0, 0, w, h)
      c.clip()

      h /= 2

      const timelineHistories = programCtx.histories.value.filter((
        hist,
      ): hist is typeof hist & { genName: 'Timeline' } => hist.genName === 'Timeline')
      const labels = [...(programCtx.result.value?.compile?.labels ?? [])].sort((a, b) => a.bar - b.bar)
      const sampleRate = programCtx.latency.value.state.sampleRate || 44100
      const minimapH = Math.max(4, h - 4)

      const drawTint = (startX: number, endX: number, color: string) => {
        const start = Math.max(0, Math.min(w, startX))
        const end = Math.max(0, Math.min(w, endX))
        const ww = Math.max(0, end - start)
        if (ww <= 0) return
        c.save()
        c.globalAlpha = 0.175
        c.fillStyle = color
        c.fillRect(start, 0, ww, h)
        c.restore()
      }

      let lastLabelColor: string | undefined
      if (labels.length > 0) {
        const labelPositions: { x: number; color: string }[] = []
        let leftColor: string | undefined
        let leftX = 0
        for (const label of labels) {
          const color = getTimelineColor(label.colorIndex)
          const labelSeconds = label.bar * barLengthSeconds
          if (labelSeconds <= timeSeconds.value) lastLabelColor = color
          if (labelSeconds <= 0) {
            leftColor = color
            leftX = (labelSeconds / totalSeconds) * w
            continue
          }
          if (labelSeconds > totalSeconds) break
          labelPositions.push({ x: (labelSeconds / totalSeconds) * w, color })
        }
        if (leftColor) labelPositions.unshift({ x: leftX, color: leftColor })
        for (let i = 0; i < labelPositions.length - 1; i++) {
          drawTint(labelPositions[i]!.x, labelPositions[i + 1]!.x, labelPositions[i]!.color)
        }
        if (labelPositions.length >= 1) {
          drawTint(labelPositions[labelPositions.length - 1]!.x, w, labelPositions[labelPositions.length - 1]!.color)
        }
      }

      const loopBegin = t.getLoopBeginSamples()
      const loopEnd = t.getLoopEndSamples()
      if (loopBegin != null && loopEnd != null && loopEnd > loopBegin) {
        const loopBeginSec = loopBegin / sampleRate
        const loopEndSec = loopEnd / sampleRate
        const loopStartX = (loopBeginSec / totalSeconds) * w
        const loopEndX = (loopEndSec / totalSeconds) * w
        c.save()
        c.globalAlpha = 0.3
        c.fillStyle = primaryColor.value
        c.fillRect(Math.max(0, loopStartX), 0, Math.min(w, loopEndX) - Math.max(0, loopStartX), h)
        c.restore()
      }

      for (const timeline of timelineHistories) {
        const compiled = compileTimelineNotation(timeline.sequence)
        const segs = readTimelineSegsFromCompiledTimeline(compiled.bytecode, sampleRate, bpm, 0, totalSeconds)
        const curveColor = getTimelineColor((timeline as typeof timeline & { colorIndex?: number }).colorIndex)
        c.strokeStyle = curveColor
        c.lineWidth = 1.35
        c.lineCap = 'square'
        c.lineJoin = 'miter'
        c.beginPath()
        for (let px = 0; px <= w; px += 0.5) {
          const t = (px / w) * totalSeconds
          const sample = t * sampleRate
          const v = getTimelineValueAtSample(segs, sample)
          const vy = (1 - v) * minimapH / 2 + minimapH / 2 + 2
          if (px === 0) c.moveTo(px, vy)
          else c.lineTo(px, vy)
        }
        c.stroke()
      }

      let prevLabelX = -Infinity
      for (let barIndex = 0; barIndex <= barCount; barIndex += MINIMAP_MINOR_STEP) {
        const x = (barIndex / barCount) * (w - 1)
        // if (hasLabels) {
        //   while (labelStartIndex < labelStarts.length && labelStarts[labelStartIndex]! <= barIndex) {
        //     start = labelStarts[labelStartIndex]!
        //     labelStartIndex++
        //   }
        // }
        let start = 0
        const zeroBased = false
        const hasLabels = false
        const isMajor = hasLabels
          ? (barIndex - start) % MINIMAP_MAJOR_STEP === 0
          : barIndex % MINIMAP_MAJOR_STEP === 0
        // Draw a small phrase number above the major marker
        c.fillStyle = isMajor ? '#fff' : 'rgba(255, 255, 255, 0.35)'
        c.font = isMajor ? 'bold 6pt Outfit' : '6pt Outfit'
        c.textAlign = 'left'
        c.textBaseline = 'middle'
        const phraseNumber = String(zeroBased ? barIndex : barIndex + 1)
        // place label a few pixels from the top-left of the marker
        if (x - prevLabelX > 20) {
          c.fillText(phraseNumber, x + 5, 6)
          prevLabelX = x

          // if (barIndex >= barCount) continue
          c.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)'
          c.lineWidth = 1
          c.beginPath()
          c.moveTo(x, 0)
          c.lineTo(x, h)
          c.stroke()
        }
      }

      {
        const currentRatio = timeSeconds.value / totalSeconds
        const minimapPlayheadX = currentRatio * w + 1
        const minimapPlayheadColor = lastLabelColor ?? secondaryColor.value

        c.strokeStyle = minimapPlayheadColor
        c.lineWidth = 2
        c.beginPath()
        c.moveTo(minimapPlayheadX, 0)
        c.lineTo(minimapPlayheadX, h)
        c.stroke()

        c.fillStyle = minimapPlayheadColor + '44'
        c.fillRect(Math.max(0, minimapPlayheadX - 1.5), 0, 3, h)
      }

      y += h

      c.fillStyle = primaryColor.value
      c.fillRect(0, y - 0.5, w, 2)

      y += 1.5

      if (labels.length > 0) {
        const scrubDrawTint = (startX: number, endX: number, color: string) => {
          const start = Math.max(0, Math.min(w, startX))
          const end = Math.max(0, Math.min(w, endX))
          const ww = Math.max(0, end - start)
          if (ww <= 0) return
          c.save()
          c.globalAlpha = 0.175
          c.fillStyle = color
          c.fillRect(start, y, ww, h)
          c.restore()
        }
        const scrubLabelPositions: { x: number; color: string }[] = []
        let leftColor: string | undefined
        let leftX = 0
        for (const label of labels) {
          const color = getTimelineColor(label.colorIndex)
          const labelSeconds = label.bar * barLengthSeconds
          const labelX = (labelSeconds - windowStartTime) * pxPerSecond
          if (labelSeconds <= windowStartTime) {
            leftColor = color
            leftX = labelX
            continue
          }
          if (labelSeconds > windowEndTime) break
          scrubLabelPositions.push({ x: labelX, color })
        }
        if (leftColor) scrubLabelPositions.unshift({ x: leftX, color: leftColor })
        for (let i = 0; i < scrubLabelPositions.length - 1; i++) {
          scrubDrawTint(scrubLabelPositions[i]!.x, scrubLabelPositions[i + 1]!.x, scrubLabelPositions[i]!.color)
        }
        if (scrubLabelPositions.length >= 1) {
          scrubDrawTint(scrubLabelPositions[scrubLabelPositions.length - 1]!.x, w,
            scrubLabelPositions[scrubLabelPositions.length - 1]!.color)
        }
      }

      if (loopBegin != null && loopEnd != null && loopEnd > loopBegin) {
        const loopBeginSec = loopBegin / sampleRate
        const loopEndSec = loopEnd / sampleRate
        const loopStartX = (loopBeginSec - windowStartTime) * pxPerSecond
        const loopEndX = (loopEndSec - windowStartTime) * pxPerSecond
        const start = Math.max(0, Math.min(w, loopStartX))
        const end = Math.max(0, Math.min(w, loopEndX))
        const ww = Math.max(0, end - start)
        if (ww > 0) {
          c.save()
          c.globalAlpha = 0.3
          c.fillStyle = primaryColor.value
          c.fillRect(start, y, ww, h)
          c.restore()
        }
      }

      const barSizes = new Map<number, { barNum: number; time: number }>()
      const firstBarStart = Math.floor(windowStartTime / barLengthSeconds) * barLengthSeconds
      for (let barStart = firstBarStart; barStart < windowEndTime + barLengthSeconds; barStart += barLengthSeconds) {
        if (barStart < 0) continue
        const barIndex = Math.round(barStart / barLengthSeconds)
        const barNumber = barIndex + 1
        const isPhraseStart = ((barNumber - 1) & 3) === 0

        const barX = (barStart - windowStartTime) * pxPerSecond

        c.strokeStyle = isPhraseStart ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.25)'
        c.lineWidth = isPhraseStart ? 1.5 : 1
        c.beginPath()
        c.moveTo(barX, y)
        c.lineTo(barX, y + h)
        c.stroke()

        const rowY = y + 11.5
        c.textBaseline = 'middle'
        c.textAlign = 'left'

        c.fillStyle = isPhraseStart ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.75)'
        c.font = isPhraseStart ? 'bold 9pt Outfit' : 'normal 8pt Outfit'
        c.fillText(String(barNumber), barX + 7, rowY)
        const barNumWidth = c.measureText(String(barNumber)).width

        const t = Math.max(0, barStart)
        const mins = Math.round(t / 60)
        const secs = Math.round(t % 60)
        const timeLabel = mins + ':' + String(secs).padStart(2, '0')
        c.font = '6.5pt Outfit'
        c.fillStyle = 'rgba(200,200,200,0.6)'
        c.fillText(timeLabel, barX + 7 + barNumWidth + 5, rowY)
        const timeWidth = c.measureText(timeLabel).width
        barSizes.set(barIndex, { barNum: barNumWidth, time: timeWidth })
      }

      if (labels.length > 0) {
        c.textAlign = 'left'
        c.textBaseline = 'middle'
        c.font = '800 7.5pt Outfit'
        const rowY = y + 11.5
        for (let i = 0; i < labels.length; i++) {
          const label = labels[i]!
          const labelSeconds = label.bar * barLengthSeconds
          if (labelSeconds > windowEndTime) continue
          let labelX = (labelSeconds - windowStartTime) * pxPerSecond
          const origLabelX = labelX
          const sizes = barSizes.get(label.bar)
          let barNumWidth = sizes?.barNum ?? c.measureText(String(label.bar + 1)).width
          let timeWidth = sizes?.time
          if (timeWidth === undefined) {
            const t = Math.max(0, label.bar * barLengthSeconds)
            const mins = Math.round(t / 60)
            const secs = Math.round(t % 60)
            c.font = '6.5pt Outfit'
            timeWidth = c.measureText(mins + ':' + String(secs).padStart(2, '0')).width
            c.font = '800 7pt Outfit'
          }
          const labelStart = origLabelX + 7 + barNumWidth + 5 + timeWidth
          if (playheadX > labelStart) labelX = playheadX
          const color = getTimelineColor(label.colorIndex)
          const nextLabel = labels[i + 1]
          if (nextLabel) {
            const nextLabelSeconds = nextLabel.bar * barLengthSeconds
            const nextLabelX = (nextLabelSeconds - windowStartTime) * pxPerSecond
            const textWidth = [...label.text].reduce((acc, char) => acc + c.measureText(char).width + 0.5, 0) - 1
            if (labelX + LABEL_PADDING + textWidth > nextLabelX - 2 * LABEL_PADDING) {
              labelX = Math.min(playheadX, nextLabelX - 3 * LABEL_PADDING - textWidth)
            }
          }
          if (origLabelX === labelX && playheadX < origLabelX) {
            c.strokeStyle = color
            c.lineWidth = 1.5
            c.beginPath()
            c.moveTo(labelX, y)
            c.lineTo(labelX, y + h)
            c.stroke()
          }
          const latched = origLabelX !== labelX
          const textX = labelX + (latched ? LABEL_PADDING : 7 + barNumWidth + 5 + timeWidth + LABEL_PADDING)
          c.fillStyle = color
          let px = textX
          for (const char of label.text) {
            c.fillText(char, px, rowY)
            px += c.measureText(char).width + 1.5
          }
        }
      }

      const playheadColor = lastLabelColor ?? secondaryColor.value

      c.strokeStyle = playheadColor
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(playheadX, y)
      c.lineTo(playheadX, y + h)
      c.stroke()

      c.restore()
    },
  }
}
