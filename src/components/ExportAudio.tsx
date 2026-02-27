import { CircleNotchIcon, DownloadSimpleIcon, StopCircleIcon, WaveformIcon } from '@phosphor-icons/react'
import { useComputed, useSignal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import WavEncoder from 'wav-encoder'
import { useAsyncMemo } from '../hooks/useAsyncMemo.ts'
import { throttle } from '../lib/throttle.ts'
import {
  audioContext,
  backgroundColor,
  bpm,
  ctx,
  currentProgramContext,
  currentProject,
  primaryColor,
  session,
} from '../state.ts'
import { BEATS_PER_BAR } from '../widgets/constants.ts'
import { PauseGradientIcon, PlayGradientIcon } from './Icons.tsx'
import { SidebarButton } from './SidebarButton.tsx'

export const ExportAudio = () => {
  const barsInputValue = useSignal(3)
  const numberOfBars = useComputed(() => !barsInputValue.value ? 1 : 2 ** (barsInputValue.value))
  const duration = useComputed(() => {
    const barLengthSeconds = (BEATS_PER_BAR * 60) / bpm.value
    return numberOfBars.value * barLengthSeconds
  })
  const durationInMinutes = useComputed(() => {
    const durationInSeconds = duration.value
    const minutes = Math.floor(durationInSeconds / 60)
    const seconds = durationInSeconds % 60
    return `${minutes}:${seconds.toFixed(0).padStart(2, '0')}`
  })
  const startedRendering = useSignal(false)
  const progress = useSignal(0)
  const floats = useSignal<{ left: Float32Array; right: Float32Array } | null>(null)
  const playing = useSignal(false)
  const position = useSignal(0)
  const scrubbing = useSignal(false)
  const scrubRatio = useSignal(0)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const seekTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSeekRef = useRef<number | null>(null)
  const runSeekRef = useRef<() => void>(() => {})
  const startTimeRef = useRef(0)
  const playOffsetRef = useRef(0)
  const rafRef = useRef<number>(0)
  const fadeOut = 16
  const seekFade = 0.03
  const seekThrottleMs = 80
  const stopRendering = useSignal(false)

  const applyFadeOut = (left: Float32Array, right: Float32Array) => {
    const len = left.length
    if (len >= fadeOut) {
      for (let j = 0; j < fadeOut; j++) {
        const gain = 1 - j / fadeOut
        left[len - fadeOut + j] *= gain
        right[len - fadeOut + j] *= gain
      }
    }
  }

  const wavBlob = useAsyncMemo(async () => {
    if (!audioContext.value) return
    if (!floats.value) return

    const wavBuffer = await WavEncoder.encode({
      sampleRate: audioContext.value.sampleRate,
      channelData: [floats.value.left, floats.value.right],
    })

    return new Blob([wavBuffer], { type: 'audio/wav' })
  })

  const audioBuffer = useComputed(() => {
    const ac = audioContext.value
    const f = floats.value
    if (!ac || !f) return null
    const buf = ac.createBuffer(2, f.left.length, ac.sampleRate)
    buf.getChannelData(0).set(f.left)
    buf.getChannelData(1).set(f.right)
    return buf
  })

  const bufferDuration = useComputed(() => audioBuffer.value?.duration ?? 0)

  useEffect(() => {
    if (!playing.value || bufferDuration.value <= 0) return
    const ac = audioContext.value
    if (!ac) return
    const tick = () => {
      if (!playing.value) return
      const t = (playOffsetRef.current + (ac.currentTime - startTimeRef.current)) % bufferDuration.value
      position.value = t
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing.value, bufferDuration.value])

  useEffect(() => {
    return () => {
      if (seekTransitionRef.current) clearTimeout(seekTransitionRef.current)
      if (stopTransitionRef.current) clearTimeout(stopTransitionRef.current)
      cancelAnimationFrame(rafRef.current)
      sourceRef.current?.stop()
      sourceRef.current = null
    }
  }, [])

  const startSource = (offsetSeconds: number, fadeIn: boolean) => {
    const ac = audioContext.value
    const buf = audioBuffer.value
    if (!ac || !buf) return
    const source = ac.createBufferSource()
    source.buffer = buf
    source.loop = true
    const gain = ac.createGain()
    gain.connect(ac.destination)
    source.connect(gain)
    gainRef.current = gain
    if (fadeIn) {
      gain.gain.setValueAtTime(0, ac.currentTime)
      gain.gain.linearRampToValueAtTime(1, ac.currentTime + seekFade)
    }
    else {
      gain.gain.setValueAtTime(1, ac.currentTime)
    }
    source.start(0, offsetSeconds)
    sourceRef.current = source
    playOffsetRef.current = offsetSeconds
    startTimeRef.current = ac.currentTime
    source.onended = () => {
      if (sourceRef.current === source) {
        sourceRef.current = null
        gainRef.current = null
        playing.value = false
      }
    }
  }

  const doSeekTransition = () => {
    const dur = bufferDuration.value
    if (dur <= 0) return
    const target = Math.max(0, Math.min(position.value, dur))
    const ac = audioContext.value
    const source = sourceRef.current
    const gain = gainRef.current

    if (seekTransitionRef.current) {
      pendingSeekRef.current = target
      return
    }

    if (!ac) return
    if (!source || !gain) {
      startSource(target, false)
      return
    }

    gain.gain.setValueAtTime(gain.gain.value, ac.currentTime)
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + seekFade)
    const t = seekFade * 1000 + 5
    seekTransitionRef.current = setTimeout(() => {
      seekTransitionRef.current = null
      const startAt = pendingSeekRef.current ?? target
      pendingSeekRef.current = null
      source.stop()
      sourceRef.current = null
      gainRef.current = null
      startSource(startAt, true)
    }, t)
  }

  const throttledSeek = throttle(doSeekTransition, seekThrottleMs)

  const handleSeek = (seconds: number) => {
    const dur = bufferDuration.value
    if (dur <= 0) return
    const s = Math.max(0, Math.min(seconds, dur))
    position.value = s
    if (!playing.value) return
    throttledSeek()
  }

  const sliderRatio = useComputed(() => {
    const dur = bufferDuration.value
    if (dur <= 0) return 0
    return scrubbing.value ? scrubRatio.value : position.value / dur
  })

  const onScrubStart = () => {
    scrubbing.value = true
    scrubRatio.value = bufferDuration.value > 0 ? position.value / bufferDuration.value : 0
  }

  const onScrubInput = (e: Event) => {
    scrubRatio.value = parseFloat((e.target as HTMLInputElement).value)
    handleSeek(scrubRatio.value * bufferDuration.value)
  }

  const onScrubEnd = () => {
    scrubbing.value = false
    handleSeek(scrubRatio.value * bufferDuration.value)
  }

  const handlePlayStop = () => {
    const ac = audioContext.value
    const buf = audioBuffer.value
    if (!ac || !buf) return

    if (playing.value) {
      const dur = buf.duration
      position.value = (playOffsetRef.current + (ac.currentTime - startTimeRef.current)) % dur
      if (seekTransitionRef.current) {
        clearTimeout(seekTransitionRef.current)
        seekTransitionRef.current = null
      }
      pendingSeekRef.current = null
      const source = sourceRef.current
      const gain = gainRef.current
      if (!source || !gain) {
        sourceRef.current = null
        gainRef.current = null
        playing.value = false
        return
      }
      if (stopTransitionRef.current) {
        clearTimeout(stopTransitionRef.current)
        stopTransitionRef.current = null
      }
      gain.gain.setValueAtTime(gain.gain.value, ac.currentTime)
      gain.gain.linearRampToValueAtTime(0, ac.currentTime + seekFade)
      const t = seekFade * 1000 + 5
      stopTransitionRef.current = setTimeout(() => {
        stopTransitionRef.current = null
        source.stop()
        sourceRef.current = null
        gainRef.current = null
        playing.value = false
      }, t)
      return
    }

    ac.resume()
    playing.value = true
    startSource(position.value, position.value > 0)
  }

  const handleDownload = () => {
    if (!wavBlob.value) return
    const sanitize = (s: string) => s.replace(/\s+/g, ' ').replace(/[/\\:*?"<>|]/g, '')
    const artist = session.value?.artistName ? sanitize(session.value.artistName) : ''
    const title = sanitize((currentProject.value?.name ?? 'export').trim() || 'export')
    const base = artist ? `${artist} - ${title}` : title
    const url = URL.createObjectURL(wavBlob.value)
    const a = document.createElement('a')
    a.href = url
    a.download = `${base}.wav`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRender = async () => {
    if (!ctx.value || !currentProgramContext.value) return
    if (playing.value) {
      if (seekTransitionRef.current) {
        clearTimeout(seekTransitionRef.current)
        seekTransitionRef.current = null
      }
      if (stopTransitionRef.current) {
        clearTimeout(stopTransitionRef.current)
        stopTransitionRef.current = null
      }
      pendingSeekRef.current = null
      sourceRef.current?.stop()
      sourceRef.current = null
      gainRef.current = null
      playing.value = false
    }
    startedRendering.value = true
    await new Promise(resolve => requestAnimationFrame(resolve))
    const { dsp } = ctx.value
    const doc = currentProgramContext.value.doc
    const gen = dsp.core.preview.renderToAudio(doc.code, numberOfBars.value, BEATS_PER_BAR)
    let step
    try {
      while (!(step = gen.next()).done) {
        if (stopRendering.value) {
          throw new Error('Rendering stopped')
        }
        progress.value = step.value
        await new Promise(resolve => requestAnimationFrame(resolve))
      }
      const left = step.value.left.slice()
      const right = step.value.right.slice()
      applyFadeOut(left, right)
      floats.value = { left, right }
    }
    catch (error) {
      console.error(error)
    }
    finally {
      position.value = 0
      progress.value = 0
      startedRendering.value = false
      stopRendering.value = false
    }
  }

  const handleStopRendering = () => {
    stopRendering.value = true
  }

  const hasAudio = !!floats.value && !startedRendering.value

  return (
    <div class="flex flex-col h-full w-52 py-2.5 text-neutral-400 text-sm select-none">
      <div class="relative flex flex-col">
        <div class="py-1 px-2 w-full text-sm flex flex-row items-center justify-between gap-2">
          <div class="whitespace-nowrap mr-1.5">
            Bars
          </div>
          <input type="range" min="0" max="9" value={barsInputValue}
            onChange={e => barsInputValue.value = Number((e.target as HTMLInputElement).value)} class="w-full h-1 my-2"
            style={{
              accentColor: primaryColor.value,
            }} />
          <div class="w-[40px] text-right">{numberOfBars}</div>
        </div>
        <div class="py-1 px-2 w-full flex flex-row items-center justify-between gap-2">
          <div>Duration:</div>
          <div>{durationInMinutes}</div>
        </div>
        {startedRendering.value && (
          <div
            class={`absolute top-0 left-0 w-full h-full flex items-center justify-center cursor-wait bg-[${backgroundColor.value}] bg-opacity-50`}
          >
            {/* <SpinnerSmall /> */}
          </div>
        )}
      </div>
      <SidebarButton onClick={handleRender} disabled={startedRendering.value}>
        {startedRendering.value
          ? <CircleNotchIcon size={16} class="animate-spin" />
          : <WaveformIcon size={16} class="group-hover:text-white" />}
        {startedRendering.value ? <span>Rendering...</span> : <span>Render</span>}
      </SidebarButton>
      {!hasAudio && (
        <div class="mx-2 my-3 mb-[13.5px]">
          <div class={`h-0.5 bg-[${primaryColor.value}]`} style={{ width: `${progress.value * 100}%` }} />
        </div>
      )}
      {!hasAudio && startedRendering.value && (
        <SidebarButton onClick={handleStopRendering}>
          <StopCircleIcon size={16} />
          <span>Stop</span>
        </SidebarButton>
      )}
      {hasAudio && (
        <>
          <div class="px-2 my-1 mb-1 flex flex-row gap-0.5 items-center">
            <button onClick={handlePlayStop} class="pr-1">
              {playing.value ? <PauseGradientIcon size={16} /> : <PlayGradientIcon size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={sliderRatio.value}
              onMouseDown={onScrubStart}
              onTouchStart={onScrubStart}
              onInput={onScrubInput}
              onMouseUp={onScrubEnd}
              onMouseLeave={e => (e.buttons === 1 ? onScrubEnd() : null)}
              onTouchEnd={onScrubEnd}
              class="w-full h-[3.5px] my-2"
              style={{ accentColor: primaryColor.value }}
            />
          </div>
          <SidebarButton onClick={handleDownload} disabled={!wavBlob.value}>
            <DownloadSimpleIcon size={16} class="group-hover:text-white" />
            <span>Download</span>
          </SidebarButton>
        </>
      )}
    </div>
  )
}
