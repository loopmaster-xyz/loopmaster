import { batch, computed, effect, type Signal, signal, untracked } from '@preact/signals-core'
import { createDoc, type Doc, type Widgets } from 'editor'
import type { ControlCompileSnapshot, Dsp, EveryHistory, LfosineHistory } from 'engine'
import {
  createDsp,
  createDspState,
  type DspLatency,
  type TypedHistory,
  UserCallHistory,
} from 'engine'
import { atomic } from './lib/atomic.ts'
import { computeDocErrors } from './lib/format-errors.ts'
import { tokenize } from './lib/tokenizer.ts'
import type { WaveformBuffer } from './lib/waveform-buffer.ts'
import { settings } from './settings.ts'
import { backgroundColor, busyBounce, isScrubbing, shouldSkipSyncPreview, skipSyncPreview, tickCount,
  widgetOptions } from './state.ts'
import { createAdWidget } from './widgets/ad.ts'
import { createAdsrWidget } from './widgets/adsr.ts'
import { createArrayGetWidgets } from './widgets/array-get.ts'
import { relocateWidgetCacheKeys } from './widgets/cache-key.ts'
import type { WidgetCacheEntry } from './widgets/cache.ts'
import { createCompressorWidget } from './widgets/compressor.ts'
import { createEveryWidget } from './widgets/every.ts'
import { createFilterWidget } from './widgets/filter.ts'
import { createKnobWidgets } from './widgets/knob.ts'
import { createLfoWidget } from './widgets/lfo.ts'
import { createLogWidget } from './widgets/log.ts'
import { createMiniWidgets } from './widgets/mini.ts'
import { createPianoWidget } from './widgets/piano.ts'
import { createReverbWidget } from './widgets/reverb.ts'
import { createSamplerWidget } from './widgets/sampler.ts'
import { createSlicerWidget } from './widgets/slicer.ts'
import { createTimelineWidgets } from './widgets/timeline.ts'
import { createTramWidgets } from './widgets/tram.ts'
import { type AmpCanvasState, createWaveWidget } from './widgets/wave.ts'
import type { WaveformCache } from './widgets/waveform-cache.ts'

export type { WidgetCacheEntry }

export type DspWidgetContext = {
  doc: Doc
  result: Signal<ControlCompileSnapshot | null>
  latency: Signal<DspLatency>
  timeSeconds: Signal<number>
  waveformBuffers: Map<number, WaveformBuffer>
  animatedHeightsArrMap: Map<number, Array<Float32Array | undefined>>
  ampCanvasArrMap: Map<number, Array<AmpCanvasState | undefined>>
  waveformCaches: Map<number, WaveformCache>
  waveMultiplierMap: Map<number, number>
  widgetsCache: Map<string, WidgetCacheEntry>
  isPlayingThis: Signal<boolean>
  waveBackground: Signal<string>
}

export type DspProgramContextOpts = {
  doc?: Doc
  vmId?: number
  projectId?: string | null
  isPlayingThis: Signal<boolean>
  waveBackground?: Signal<string>
}

type CreateWidgetsFn = (
  ctx: DspWidgetContext,
  histories: TypedHistory[],
  userCallHistories: UserCallHistory[],
) => Widgets

const DEBUG_PREVIEW_TIMING = false

function runPreviewSync(
  p: DspProgramContext,
  dsp: Dsp,
): { histories: TypedHistory[]; userCallHistories: UserCallHistory[] } | null {
  const t0 = DEBUG_PREVIEW_TIMING ? performance.now() : 0
  try {
    p.result.value = dsp.core.preview.setCode(p.doc.code, { projectId: p.opts.projectId })
    p.doc.errors = computeDocErrors(p.result.value)
  }
  catch (error) {
    console.error(error)
    p.doc.errors = computeDocErrors(null, (error instanceof Error ? error.message : String(error)).split(' in ')[0])
    return null
  }
  try {
    const previewResult = dsp.core.preview.runPreview(p.opts.vmId)
    if (DEBUG_PREVIEW_TIMING) console.log('[dsp] runPreviewSync total', (performance.now() - t0).toFixed(2), 'ms')
    return {
      histories: previewResult.histories,
      userCallHistories: previewResult.userCallHistories,
    }
  }
  catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : String(error)
    p.doc.errors = computeDocErrors(p.result.value, message)
    return null
  }
}

const updatePreview = atomic(
  async (p: DspProgramContext, dsp: Dsp, fullResync: boolean) => {
    try {
      const result = await p.program.setCode(p.doc.code, { fullResync, projectId: p.opts.projectId })
      if (p.opts.isPlayingThis.value) {
        p.result.value = result
        return {
          histories: p.program.histories,
          userCallHistories: p.program.userCallHistories,
        }
      }
    }
    catch (error) {
      console.error(error)
      p.doc.errors = computeDocErrors(null, (error instanceof Error ? error.message : String(error)).split(' in ')[0])
      return null
    }
    return runPreviewSync(p, dsp)
  },
)

async function createDspProgramContextImpl(
  dsp: Awaited<ReturnType<typeof createDsp>>,
  createWidgets: CreateWidgetsFn,
  opts: DspProgramContextOpts,
  historiesRefreshed: { value: number },
) {
  const program = await dsp.createProgram()
  const doc = opts.doc ?? createDoc(tokenize)

  const previewEpoch = signal(-1)
  const setCodeEpoch = signal(-1)

  const result = signal<ControlCompileSnapshot | null>(null)
  const latency = signal<DspLatency>(program.latency)
  const timeSeconds = signal(0)
  const histories = signal<TypedHistory[]>([])
  const userCallHistories = signal<UserCallHistory[]>([])
  const fullResync = signal(true)

  const waveformBuffers = new Map<number, WaveformBuffer>()
  const animatedHeightsArrMap = new Map<number, Array<Float32Array | undefined>>()
  const ampCanvasArrMap = new Map<number, Array<AmpCanvasState | undefined>>()
  const waveformCaches = new Map<number, WaveformCache>()
  const waveMultiplierMap = new Map<number, number>()
  const widgetsCache = new Map<string, WidgetCacheEntry>()

  const unsubscribeDocChanges = doc.buffer.onChange(change => {
    if (change.type === 'reset') {
      widgetsCache.clear()
      return
    }
    relocateWidgetCacheKeys(
      widgetsCache as unknown as Map<string, unknown>,
      change.start,
      change.deletedText.length,
      change.insertedText.length,
    )
  })

  const tooltipWaveformBuffers = new Map<number, WaveformBuffer>()
  const tooltipAnimatedHeightsArrMap = new Map<number, Array<Float32Array | undefined>>()
  const tooltipAmpCanvasArrMap = new Map<number, Array<AmpCanvasState | undefined>>()
  const tooltipWaveformCaches = new Map<number, WaveformCache>()
  const tooltipWaveMultiplierMap = new Map<number, number>()

  const waveBackground = opts.waveBackground ?? computed(() => backgroundColor.value)
  const tooltipWaveBackground = computed(() => backgroundColor.value)
  const widgetContext: DspWidgetContext = {
    doc,
    result,
    latency,
    timeSeconds,
    waveformBuffers,
    animatedHeightsArrMap,
    ampCanvasArrMap,
    waveformCaches,
    waveMultiplierMap,
    widgetsCache,
    isPlayingThis: opts.isPlayingThis,
    waveBackground,
  }

  const tooltipWidgetContext: DspWidgetContext = {
    doc,
    result,
    latency,
    timeSeconds,
    waveformBuffers: tooltipWaveformBuffers,
    animatedHeightsArrMap: tooltipAnimatedHeightsArrMap,
    ampCanvasArrMap: tooltipAmpCanvasArrMap,
    waveformCaches: tooltipWaveformCaches,
    waveMultiplierMap: tooltipWaveMultiplierMap,
    widgetsCache,
    isPlayingThis: opts.isPlayingThis,
    waveBackground: tooltipWaveBackground,
  }

  const dispose = () => {
    unsubscribeDocChanges()
    dsp.stop([program])
  }

  const p = {
    opts,
    program,
    doc,
    result,
    latency,
    timeSeconds,
    histories,
    userCallHistories,
    widgetContext,
    tooltipWidgetContext,
    fullResync,
    dispose,
  }

  // effect(() => {
  //   docLength.value = doc.code.length
  // })

  // effect(() => {
  //   docLength.value
  //   widgetsCache.clear()
  // })

  const syncPreviewEpoch = signal(-1)

  effect(() => {
    if (shouldSkipSyncPreview.peek()) return
    doc.code
    const epoch = doc.epoch
    queueMicrotask(() => {
      if (epoch !== doc.epoch) return
      batch(() => {
        if (syncPreviewEpoch.value === doc.epoch) return
        const snapshot = runPreviewSync(p, dsp)
        if (snapshot) {
          syncPreviewEpoch.value = doc.epoch
          program.latency.update()
          latency.value = program.latency
          timeSeconds.value = program.latency.state.timeSeconds ?? 0
          histories.value = snapshot.histories
          userCallHistories.value = snapshot.userCallHistories
          fullResync.value = false
          doc.widgets = createWidgets(widgetContext, snapshot.histories, snapshot.userCallHistories)
          previewEpoch.value = doc.epoch
        }
      })
    })
  })

  effect(() => {
    if (opts.isPlayingThis.value || isScrubbing.value) return
    if (!fullResync.value) return
    doc.code
    updatePreview(p, dsp, fullResync.value).then(result => {
      batch(() => {
        if (result) {
          setCodeEpoch.value = doc.epoch
          previewEpoch.value = doc.epoch
          program.latency.update()
          latency.value = program.latency
          timeSeconds.value = program.latency.state.timeSeconds ?? 0
          histories.value = result.histories
          userCallHistories.value = result.userCallHistories
        }
        fullResync.value = false
      })
    })
  })

  // cheap per-frame latency/time update while playing
  effect(() => {
    if (!opts.isPlayingThis.value) return
    tickCount.value
    untracked(() => {
      program.latency.update()
      latency.value = program.latency
      timeSeconds.value = program.latency.state.timeSeconds ?? 0
    })
  })

  // pull histories only when the engine tells us they changed
  effect(() => {
    if (!opts.isPlayingThis.value) return
    historiesRefreshed.value
    untracked(() => {
      program.refreshHistories()
      histories.value = program.histories
      userCallHistories.value = program.userCallHistories
    })
  })

  effect(() => {
    if (!opts.isPlayingThis.value) return
    doc.code
    const epoch = doc.epoch
    queueMicrotask(() => {
      if (epoch !== doc.epoch) return
      program.setCode(doc.code, { projectId: opts.projectId }).then(r => {
        if (epoch !== doc.epoch) return
        batch(() => {
          result.value = r
          program.reapplySourceMapping(r)
          setCodeEpoch.value = epoch
          historiesRefreshed.value++
        })
      }).catch(e => {
        if (e instanceof Error && e.message.includes('Dropped')) return
        console.error(e)
        doc.errors = computeDocErrors(null, (e instanceof Error ? e.message : String(e)).split(' in ')[0])
      })
    })
  })

  effect(() => {
    if (!opts.isPlayingThis.value) return
    tickCount.value
    const workletError = dsp.state.workletError
    doc.errors = computeDocErrors(
      result.value,
      workletError ?? null,
    )
  })

  effect(() => {
    if (!histories.value.length) {
      return
    }
    if (setCodeEpoch.value === previewEpoch.value) {
      doc.widgets = createWidgets(
        widgetContext,
        histories.value,
        userCallHistories.value,
      )
    }
  })

  return p
}

export type DspProgramContext = Awaited<ReturnType<typeof createDspProgramContextImpl>>

export type DspContext = Awaited<ReturnType<typeof createDspContext>>

export async function createDspContext() {
  await new Promise<void>(queueMicrotask)
  const dspState = await createDspState({ latencyHint: settings.audioLatency })
  const historiesRefreshed = signal(0)
  dspState.onHistoriesRefreshed = () => {
    historiesRefreshed.value++
  }
  const dsp = await createDsp(dspState)

  const targetSeconds = signal(0)

  const createWidgets = (
    ctx: DspWidgetContext,
    histories: TypedHistory[],
    userCallHistories: UserCallHistory[],
  ) => {
    busyBounce()
    const widgets: Widgets = []
    if (widgetOptions.showVisuals) {
      const createHistoryWidgets = (h: TypedHistory, target: TypedHistory | UserCallHistory) => {
        if (h.genName === 'Ad') {
          widgets.push(createAdWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache))
        }
        else if (h.genName === 'Adsr') {
          widgets.push(createAdsrWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache))
        }
        else if (h.genName === 'Tram') {
          widgets.push(...createTramWidgets(h, target, ctx.doc, ctx.latency, ctx.widgetsCache))
        }
        else if (h.genName === 'Timeline') {
          widgets.push(
            ...createTimelineWidgets(h, target, ctx.doc, ctx.result, ctx.latency, ctx.timeSeconds, ctx.widgetsCache),
          )
        }
        else if (h.genName === 'ArrayGet') {
          widgets.push(...createArrayGetWidgets(h, target, ctx.doc, ctx.latency, ctx.widgetsCache))
        }
        else if (h.genName === 'Out' || h.genName === 'Solo' || h.genName === 'Analyser' || h.genName === 'Mix') {
          widgets.push(
            createWaveWidget(
              h,
              target,
              ctx.doc,
              h.genName === 'Mix' ? 'full' : 'above',
              ctx.waveformBuffers,
              ctx.animatedHeightsArrMap,
              ctx.ampCanvasArrMap,
              ctx.waveMultiplierMap,
              ctx.isPlayingThis,
              ctx.waveBackground,
              ctx.widgetsCache,
            ),
          )
        }
        else if (h.genName === 'Mini') {
          widgets.push(
            ...createMiniWidgets(h, target, dsp, ctx.doc, ctx.result, ctx.latency, ctx.timeSeconds, ctx.widgetsCache, {
              noHeader: widgetOptions.noHeader,
            }),
          )
        }
        else if (h.genName === 'Sampler') {
          widgets.push(createSamplerWidget(h, target, dsp, ctx.doc, ctx.latency, ctx.waveformCaches, ctx.widgetsCache))
        }
        else if (h.genName === 'Slicer') {
          widgets.push(createSlicerWidget(h, target, dsp, ctx.doc, ctx.latency, ctx.waveformCaches, ctx.widgetsCache))
        }
        else if (h.genName === 'Dattorro' || h.genName === 'Freeverb' || h.genName === 'Fdn'
          || h.genName === 'Velvet')
        {
          widgets.push(createReverbWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache))
        }
        else if (h.genName === 'Every' || h.genName === 'At') {
          widgets.push(createEveryWidget(h as EveryHistory, target, ctx.doc, ctx.latency, ctx.widgetsCache))
        }
        else if (h.genName === 'Emit') {
          if (h !== target) {
            if ('funcName' in target) {
              if (target.funcName === 'ntof') {
                widgets.push(
                  createPianoWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache),
                )
              }
              else if (target.funcName === 'print') {
                widgets.push(createLogWidget(h, target, ctx.doc, ctx.latency, v => v.toFixed(2), ctx.widgetsCache))
              }
            }
          }
        }
        else if (h.genName === 'Biquad' || h.genName === 'Biquadshelf' || h.genName === 'Svf'
          || h.genName === 'Onepole' || h.genName === 'Moog' || h.genName === 'Diodeladder')
        {
          const w = createFilterWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache)
          if (w) widgets.push(w)
        }
        else if (h.genName === 'Compressor') {
          widgets.push(createCompressorWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache))
        }
        else if (h.genName === 'Lfosine' || h.genName === 'Lfotri' || h.genName === 'Lfosaw'
          || h.genName === 'Lforamp' || h.genName === 'Lfosqr' || h.genName === 'Lfosah'
          || h.genName === 'Inc' || h.genName === 'Phasor' || h.genName === 'Fractal' || h.genName === 'Smooth')
        {
          widgets.push(
            createLfoWidget(h as LfosineHistory, target, ctx.doc, ctx.latency,
              h.genName.startsWith('Lfo') ? (h.genName.slice(3) as any) : 'linear', ctx.widgetsCache),
          )
        }
      }
      for (const h of histories.sort((a, b) => b.view.id - a.view.id)) {
        createHistoryWidgets(h, h)
      }
      for (const h of userCallHistories) {
        for (const innerH of h.inner.sort((a, b) => b.view.id - a.view.id)) {
          createHistoryWidgets(innerH, h)
        }
      }
    }
    if (widgetOptions.showKnobs) {
      widgets.push(...createKnobWidgets(ctx.doc, ctx.result.value, ctx.widgetsCache))
    }
    return widgets
  }

  const tooltipWaveGens = new Set([
    'Out',
    'Solo',
    'Analyser',
    'Mix',
    'Sine',
    'Saw',
    'Sqr',
    'Tri',
    'Pwm',
    'Ramp',
    'Phasor',
    'Inc',
    'Impulse',
  ])

  const createTooltipWidget = (
    h: TypedHistory,
    target: TypedHistory | UserCallHistory = h,
    ctx: DspWidgetContext,
  ) => {
    if (h.genName === 'Ad') {
      return createAdWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache)
    }
    if (h.genName === 'Adsr') {
      return createAdsrWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache)
    }
    if (h.genName === 'Biquad' || h.genName === 'Biquadshelf' || h.genName === 'Svf'
      || h.genName === 'Onepole' || h.genName === 'Moog' || h.genName === 'Diodeladder')
    {
      return createFilterWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache)
    }
    if (h.genName === 'Compressor') {
      return createCompressorWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache)
    }
    if (tooltipWaveGens.has(h.genName)) {
      return createWaveWidget(h, target, ctx.doc, h.genName === 'Mix' ? 'full' : 'above', ctx.waveformBuffers,
        ctx.animatedHeightsArrMap, ctx.ampCanvasArrMap, ctx.waveMultiplierMap, ctx.isPlayingThis, ctx.waveBackground,
        ctx.widgetsCache)
    }
    if (h.genName === 'Mini') {
      const arr = createMiniWidgets(h, target, dsp, ctx.doc, ctx.result, ctx.latency, ctx.timeSeconds, ctx.widgetsCache,
        {
          noHeader: true,
        })
      return arr.at(-1) ?? null
    }
    if (h.genName === 'Timeline') {
      const arr = createTimelineWidgets(h, target, ctx.doc, ctx.result, ctx.latency, ctx.timeSeconds, ctx.widgetsCache,
        {
          noHeader: true,
        })
      return arr.find(w => w.type === 'full') ?? arr[0] ?? null
    }
    if (h.genName === 'Sampler') {
      return createSamplerWidget(h, target, dsp, ctx.doc, ctx.latency, ctx.waveformCaches, ctx.widgetsCache)
    }
    if (h.genName === 'Slicer') {
      return createSlicerWidget(h, target, dsp, ctx.doc, ctx.latency, ctx.waveformCaches, ctx.widgetsCache)
    }
    if (h.genName === 'Dattorro' || h.genName === 'Freeverb' || h.genName === 'Fdn'
      || h.genName === 'Velvet')
    {
      return createReverbWidget(h, target, ctx.doc, ctx.latency, ctx.widgetsCache)
    }
    return null
  }

  const dispose = () => {
    dsp.state.audioContext.close()
  }

  const createDspProgramContext = (opts: DspProgramContextOpts) =>
    createDspProgramContextImpl(dsp, createWidgets, opts, historiesRefreshed)

  return {
    dispose,
    dsp,
    targetSeconds,
    historiesRefreshed,
    createWidgets,
    createTooltipWidget,
    createDspProgramContext,
  }
}
