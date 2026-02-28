import { batch, computed, effect, signal, untracked } from '@preact/signals'
import { activeEditor, createPersistedDoc, type Doc, type Editor, onKeyOverride } from 'editor'
import { ThemeColors } from 'editor/src/settings.ts'
import type { AggregatedMemoryInfo } from 'engine'
import { disassembleBytecode } from 'engine'
import { DspProgramState } from 'engine/src/dsp/worklet-shared.ts'
import { debounce } from 'utils/debounce'
import { Deferred } from 'utils/deferred'
import { luminate, saturate } from 'utils/rgb'
import WaveFFT from 'wavefft'
import type { Projects, Session } from '../deno/types.ts'
import { api } from './api.ts'
import { createDspContext, type DspContext, type DspProgramContext, type DspProgramContextOpts } from './dsp.ts'
import { blendHex } from './lib/blend-hex.ts'
import { createId } from './lib/create-id.ts'
import { autocompleteState } from './lib/definition-tooltip.ts'
import { computeDocErrors } from './lib/format-errors.ts'
import { persist, persistKeyed } from './lib/persist.ts'
import { safeJsonParse } from './lib/safe-json-parse.ts'
import { signalify } from './lib/signalify.ts'
import { tokenize } from './lib/tokenizer.ts'
import { settings } from './settings.ts'
import themes from './themes/_all.json' with { type: 'json' }
import { BEATS_PER_BAR, FILL_ALPHA } from './widgets/constants.ts'

export const session = signal<Session | null>(null)

export const busy = signal(false)
let busyTimeout: ReturnType<typeof setTimeout> | null = null
let _busyLock = false
export function busyBounce() {
  if (_busyLock) return
  busy.value = true
  if (busyTimeout) clearTimeout(busyTimeout)
  busyTimeout = setTimeout(() => {
    if (_busyLock) return
    busy.value = false
  }, 100)
}
export function busyLock() {
  if (busyTimeout) clearTimeout(busyTimeout)
  _busyLock = true
  busy.value = true
}
export function busyUnlock() {
  _busyLock = false
  busyBounce()
}
busyBounce()

persist(
  'session',
  () => session.value,
  () => ({ session: session.value }),
  data => {
    session.value = data.session ?? null
  },
)

export const editor = signal<Editor | null>(null)

export const themeName = signal<string>(
  localStorage.getItem('themeName') || 'Dracula+',
)
export const themeVariation = signal<'A' | 'B' | 'C'>(
  localStorage.getItem('themeVariation') as 'A' | 'B' | 'C' || 'B',
)

export const theme = signal<ThemeColors>(safeJsonParse(localStorage.getItem('theme')) || {
  gray: '#444444',
  black: '#000000',
  red: '#FFFFFF',
  green: '#ea580c',
  yellow: '#aaaaaa',
  blue: '#bbbbbb',
  purple: '#FFFF00',
  cyan: '#cccccc',
  white: '#dddddd',
  brightBlack: '#666666',
  brightRed: '#eeeeee',
  brightGreen: '#fafafa',
  brightYellow: '#bbbbcc',
  brightBlue: '#ccccdd',
  brightPurple: '#ddddaa',
  brightCyan: '#eeeecc',
  brightWhite: '#ffffff',
})

const actualTheme = signal<ThemeColors>({ ...theme.value })

effect(() => {
  localStorage.setItem('themeName', themeName.value)
})

effect(() => {
  localStorage.setItem('themeVariation', themeVariation.value)
})

effect(() => {
  localStorage.setItem('theme', JSON.stringify(theme.value))
})

effect(() => {
  if (themeVariation.value === 'A') {
    untracked(() => {
      theme.value = { ...actualTheme.value }
    })
  }
  else if (themeVariation.value === 'B') {
    const red = actualTheme.value.red
    const green = actualTheme.value.green
    untracked(() => {
      theme.value = {
        ...actualTheme.value,
        red: green,
        green: red,
      }
    })
  }
  else if (themeVariation.value === 'C') {
    const blue = actualTheme.value.blue
    const green = actualTheme.value.green
    untracked(() => {
      theme.value = {
        ...actualTheme.value,
        blue: green,
        green: blue,
      }
    })
  }
})

effect(() => {
  const json = themes.find(theme => theme.name === themeName.value) as any
  if (!json) {
    themeName.value = 'Pixiefloss'
    return
  }
  theme.value = json
  actualTheme.value = json
})

export const primaryColor = computed(() => theme.value.green)
export const primaryMediumColor = computed(() => blendHex(theme.value.green, theme.value.black, 0.42))
export const primaryDarkColor = computed(() => blendHex(theme.value.green, theme.value.black, FILL_ALPHA))
export const secondaryColor = computed(() => theme.value.purple)
export const grayColor = computed(() => luminate(theme.value.white, -0.5))
export const backgroundColor = computed(() => theme.value.black)
export const backgroundLightColor = computed(() => luminate(theme.value.black, 0.2))
export const textColor = computed(() => theme.value.white)
export const primaryGradientA = computed(() => luminate(primaryColor.value, 0.125))
export const primaryGradientB = computed(() => saturate(luminate(primaryColor.value, -0.2), 0.5))
export const primaryGradientStyle = computed(() => ({
  backgroundImage: `linear-gradient(to bottom right, ${primaryGradientA.value}, ${primaryGradientB.value})`,
}))

const timelineColorKeys = ['red', 'green', 'yellow', 'blue', 'purple', 'cyan'] as const
export const timelineColorByIndex = computed(() => {
  const t = theme.value
  return timelineColorKeys.map(k => t[k])
})
export function getTimelineColor(index: number | undefined): string {
  if (index == null || index < 0 || index > 5) return primaryColor.value
  return timelineColorByIndex.value[index] ?? primaryColor.value
}

export const consoleDebug = signal<string>('[no output yet...]')

export type MainPage =
  | null
  | 'editor'
  | 'docs'
  | 'tutorials'
  | 'browse'
  | 'help'
  | 'about'
  | 'admin'
  | 'artist'
  | 'project'
export const mainPage = signal<MainPage>(null)

export type SidebarTab =
  | null
  | 'projects'
  | 'browse'
  | 'bytecode'
  | 'console'
  | 'themes'
  | 'tools'
  | 'account'
  | 'help'
  | 'share-project'
  | 'export-audio'
  | 'settings'
  | 'docs'
  | 'tutorials'
  | 'browse'
  | 'admin'
  | 'artist'
  | 'ai'
export const sidebarTab = signal<SidebarTab>(null)
export const sidebarOpen = computed(() => sidebarTab.value !== null)

export const isPlaying = signal(false)
export const isPaused = signal(false)
export const isStopped = signal(false)
export const isActuallyPlaying = signal(false)
export const isActuallyPaused = signal(false)
export const isActuallyStopped = signal(false)

export const ctx = signal<DspContext | null>(null)
createDspContext().then(c => ctx.value = c)

export const wasmMemoryUsage = signal<number | null>(null)
export const memoryDebugInfo = signal<AggregatedMemoryInfo | null>(null)

export const tickCount = signal(0)
export const deferDraw = signal(false)
export const skipAnimations = signal(0)

export const currentProjectId = signal<string | null>(null)
export const playingProjectId = signal<string | null>(null)

export type Project = {
  serverId: string | null
  userId: string | null
  id: string
  name: string
  doc: Doc
  scratch: Doc
  sampleCount: number
  remixOfId: string | null
  isDirty: boolean
  isPublic: boolean
  isSaved: boolean
}

export const projects = signal<Project[]>([])

export function getNextUntitledName(): string {
  const nums = projects.value
    .map(p => {
      if (p.name === 'Untitled') return 1
      const m = p.name.match(/^Untitled (\d+)$/)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter(n => n > 0)
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return next === 1 ? 'Untitled' : `Untitled ${next}`
}

export function createProject(data: Partial<Project> = {}): Project {
  const id = data.id ?? `lm3-project-${createId()}`
  const project = signalify({
    serverId: data.serverId ?? null,
    userId: data.userId ?? session.value?.userId ?? null,
    id,
    name: data.name ?? getNextUntitledName(),
    doc: createPersistedDoc(id, tokenize, data.doc),
    scratch: createPersistedDoc(`${id}-scratch`, tokenize, data.scratch),
    sampleCount: data.sampleCount ?? 0,
    remixOfId: data.remixOfId ?? null,
    get isDirty() {
      return this.doc.code !== this.scratch.code
    },
    isPublic: data.isPublic ?? false,
    isSaved: data.isSaved ?? false,
  })
  return project
}

export const currentProject = computed(() =>
  currentProjectId.value
    ? projects.value.find(project => project.id === currentProjectId.value)
    : null
)

export const playingProject = computed(() =>
  playingProjectId.value
    ? projects.value.find(project => project.id === playingProjectId.value)
    : null
)

persistKeyed(
  () => `projects-${session.value?.userId ?? null}`,
  () => {
    currentProjectId.value
    projects.value.forEach(project => {
      Object.assign({}, project)
    })
  },
  () => ({
    currentProjectId: currentProjectId.value,
    projects: projects.value.map(project => ({
      serverId: project.serverId,
      userId: project.userId,
      id: project.id,
      name: project.name,
      sampleCount: project.sampleCount,
      remixOfId: project.remixOfId,
      isPublic: project.isPublic,
      isSaved: project.isSaved,
    })),
  }),
  data => {
    const projectsWithNoOwner = projects.value.filter(project => project.userId === null && project.scratch.code !== '')
    if (data.projects?.length) {
      projects.value = [...data.projects.map(createProject), ...projectsWithNoOwner]
      currentProjectId.value = data.currentProjectId ?? projects.value[0].id
    }
    else {
      projects.value = projectsWithNoOwner.length ? projectsWithNoOwner : [createProject()]
      currentProjectId.value = projects.value[0].id
    }
  },
)

effect(() => {
  if (!session.value) {
    projects.value = untracked(() => projects.value.filter(project => !project.userId))
    queueMicrotask(() => {
      batch(() => {
        if (!projects.value.length) {
          projects.value = [createProject()]
          currentProjectId.value = projects.value[0].id
        }
      })
    })
  }
})

effect(() => {
  if (!currentProject.value && playingProject.value) {
    currentProjectId.value = playingProjectId.value
  }
})

export const isPlayingCurrent = computed(() => playingProjectId.value === currentProjectId.value)

effect(() => {
  if (!playingProjectId.value) {
    playingProjectId.value = currentProjectId.value
  }
})

effect(() => {
  if (playingProjectId.value && !playingProject.value) {
    playingProjectId.value = currentProjectId.value
  }
})

effect(() => {
  const dsp = ctx.value?.dsp
  if (!dsp) return
  tickCount.value
  isPlaying.value = dsp.isPlaying
  isPaused.value = dsp.isPaused
  isStopped.value = dsp.isStopped
  isActuallyPlaying.value = dsp.isActuallyPlaying
  isActuallyPaused.value = dsp.isActuallyPaused
  isActuallyStopped.value = dsp.isActuallyStopped
})

let vmId = 0

export const programContexts = signal<Map<string, Promise<DspProgramContext>>>(new Map())
export const playingContext = signal<DspProgramContext | null>(null)
export const playingInlineContext = signal<DspProgramContext | null>(null)

async function createProgramContext(ctx: DspContext, opts: Partial<DspProgramContextOpts>) {
  const ref = signal<DspProgramContext | null>(null)
  const isPlayingThis = computed(() =>
    ref.value !== null && (playingContext.value === ref.value || playingInlineContext.value === ref.value)
  )
  const programCtx = await ctx.createDspProgramContext({
    vmId: vmId++,
    isPlayingThis,
    ...opts,
  })
  ref.value = programCtx
  return programCtx
}

export async function getProgramContext(ctx: DspContext, id: string, opts: Partial<DspProgramContextOpts> = {}) {
  let programContext = programContexts.value.get(id)
  if (!programContext) {
    const deferred = Deferred<DspProgramContext>()
    programContext = deferred.promise
    programContexts.value.set(id, deferred.promise)
    programContexts.value = new Map(programContexts.value)
    deferred.resolve(await createProgramContext(ctx, { ...opts, projectId: opts.projectId ?? id }))
  }
  return programContext
}

export const currentProgramContext = signal<DspProgramContext | null>(null)
export const playingProgramContext = signal<DspProgramContext | null>(null)

effect(() => {
  if (!ctx.value) return
  const currentId = currentProjectId.value
  if (!currentId) return
  const project = currentProject.value
  if (!project) return
  getProgramContext(ctx.value, currentId, { doc: project.scratch }).then(programContext => {
    batch(() => {
      currentProgramContext.value = programContext
    })
  })
})

effect(() => {
  if (!ctx.value) return
  const playingId = playingProjectId.value
  if (!playingId) return
  const project = playingProject.value
  if (!project) return
  getProgramContext(ctx.value, playingId, { doc: project.scratch }).then(programContext => {
    batch(() => {
      playingProgramContext.value = programContext
    })
  })
})

async function ensureProgramContexts() {
  if (!ctx.value) return

  const c = ctx.value
  if (!currentProjectId.value || !currentProject.value) return
  if (!playingProjectId.value || !playingProject.value) return

  const currentId = currentProjectId.value
  const playingId = playingProjectId.value
  const currentCtx = await getProgramContext(c, currentId, { doc: currentProject.value!.scratch })
  const playingCtx = await getProgramContext(c, playingId, { doc: playingProject.value!.scratch })
  batch(() => {
    currentCtx.fullResync.value = true
    playingCtx.fullResync.value = true
  })
  return { currentProgramContext: currentCtx, playingProgramContext: playingCtx }
}

effect(() => {
  const playing = playingProgramContext.value
  const project = playingProject.value
  if (playing && project && isPlaying.value) {
    playing.program.latency.update()
    playing.latency.value = playing.program.latency
    project.sampleCount = playing.program.latency.state.sampleCount
  }
})

effect(() => {
  const programCtx = currentProgramContext.value
  const workletError = ctx.value?.dsp.state.workletError
  if (!programCtx?.doc) return
  const result = programCtx.result.value
  programCtx.doc.errors = computeDocErrors(
    result,
    workletError ?? null,
  )
})

effect(() => {
  const result = currentProgramContext.value?.result.value
  if (result && editor.value) {
    editor.value.settings.caretPhaseCoeff = 120 / result.compile.bpm
  }
})

effect(() => {
  const programCtx = currentProgramContext.value
  if (!programCtx || !ctx.value) return
  tickCount.value
  if (!isActuallyPlaying.value) programCtx.program.latency.update()
  const seconds = isScrubbing.value
    ? ctx.value.targetSeconds.value
    : programCtx.latency.value.state.timeSeconds ?? 0
  if ((isScrubbing.value || !isActuallyPlaying.value) && skipAnimations.value === 0) {
    const prev = programCtx.timeSeconds.peek()
    programCtx.timeSeconds.value = prev + (seconds - prev) * 0.35
  }
  else {
    programCtx.timeSeconds.value = seconds
  }
})

export const transport = {
  start: async () => {
    if (!ctx.value) return

    const dsp = ctx.value.dsp
    await dsp.state.audioContext.resume()

    const contexts = await ensureProgramContexts()
    if (!contexts) return

    const { currentProgramContext, playingProgramContext } = contexts

    if (playingInlineContext.value) {
      await inlineTransport.stop()
    }

    if (isPlaying.value) {
      if (!isPlayingCurrent.value) {
        playingProjectId.value = currentProjectId.value
        playingContext.value = currentProgramContext
        dsp.swapPrograms(playingProgramContext.program, currentProgramContext.program)
        await dsp.refreshUntilHistories(currentProgramContext.program, { maxTries: 60 })
        deferDraw.value = true
      }
    }
    else {
      playingProjectId.value = currentProjectId.value
      playingContext.value = currentProgramContext
      await dsp.start([currentProgramContext.program])
      await dsp.refreshUntilHistories(currentProgramContext.program, { maxTries: 60 })
    }
  },
  pause: async () => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    const contexts = await ensureProgramContexts()
    if (!contexts) return
    dsp.togglePause([contexts.playingProgramContext.program])
  },
  stop: async () => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    const contexts = await ensureProgramContexts()
    if (!contexts) return
    const { currentProgramContext, playingProgramContext } = contexts
    if (!isActuallyPlaying.value) {
      dsp.seek(0, [currentProgramContext.program], false)
      return
    }
    playingContext.value = null
    await dsp.stop([playingProgramContext.program])
  },
  restart: async () => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    await dsp.state.audioContext.resume()
    const contexts = await ensureProgramContexts()
    if (!contexts) return
    const { currentProgramContext, playingProgramContext } = contexts
    skipAnimations.value += 1
    dsp.seek(0, [currentProgramContext.program], false)
    if (isPlaying.value) {
      if (!isPlayingCurrent.value) {
        playingProjectId.value = currentProjectId.value
        playingContext.value = currentProgramContext
        dsp.swapPrograms(playingProgramContext.program, currentProgramContext.program)
        await dsp.refreshUntilHistories(currentProgramContext.program, { maxTries: 60 })
        deferDraw.value = true
      }
    }
    else {
      playingProjectId.value = currentProjectId.value
      playingContext.value = currentProgramContext
      await dsp.start([currentProgramContext.program])
      await dsp.refreshUntilHistories(currentProgramContext.program, { maxTries: 60 })
    }
  },
  beginSeek: async () => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    const contexts = await ensureProgramContexts()
    if (!contexts) return
    isScrubbing.value = true
    scrubbingProgramState.value = contexts.currentProgramContext.program.state
    dsp.pause([contexts.currentProgramContext.program])
  },
  endSeek: async () => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    const contexts = await ensureProgramContexts()
    if (!contexts) return
    if (scrubbingProgramState.value === DspProgramState.Start) {
      dsp.start([contexts.currentProgramContext.program])
    }
    else {
      dsp.pause([contexts.currentProgramContext.program])
    }
    isScrubbing.value = false
  },
  seek: async (seconds: number) => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    const contexts = await ensureProgramContexts()
    if (!contexts) return
    const sampleRate = contexts.currentProgramContext.latency.value.state.sampleRate
    const sampleCount = Math.round(seconds * sampleRate)
    await dsp.seek(
      sampleCount,
      [contexts.currentProgramContext.program],
      scrubbingProgramState.value === DspProgramState.Start && isPlayingCurrent.value,
    )
  },
  getLoopBeginSamples: () => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    return dsp.loopBeginSamples
  },
  getLoopEndSamples: () => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    return dsp.loopEndSamples
  },
  setLoopBeginSamples: (samples: number) => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    dsp.loopBeginSamples = samples
  },
  setLoopEndSamples: (samples: number) => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    dsp.loopEndSamples = samples
  },
  setProjectEndSamples: (samples: number) => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    dsp.projectEndSamples = samples
  },
}

export const inlineTransport = {
  start: async (inline: DspProgramContext) => {
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    await dsp.state.audioContext.resume()
    if (playingContext.value) {
      await transport.stop()
    }
    if (playingInlineContext.value) {
      await inlineTransport.stop()
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    playingInlineContext.value = inline
    await dsp.start([inline.program])
    await dsp.refreshUntilHistories(inline.program, { maxTries: 60 })
    deferDraw.value = true
  },
  stop: async () => {
    if (!playingInlineContext.value) return
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    const { program } = playingInlineContext.value
    playingInlineContext.value = null
    await dsp.stop([program])
  },
  restart: async () => {
    if (!playingInlineContext.value) return
    if (!ctx.value) return
    const dsp = ctx.value.dsp
    await dsp.state.audioContext.resume()
    await dsp.seek(0, [playingInlineContext.value.program], false)
    await dsp.start([playingInlineContext.value.program])
  },
}

export const isScrubbing = signal(false)
export const scrubbingProgramState = signal<DspProgramState>(DspProgramState.Stop)

export function createNewProject() {
  const project = createProject()
  batch(() => {
    projects.value = [...projects.value, project]
    currentProjectId.value = project.id
  })
}

export async function deleteProject(project: Project) {
  const wasCurrent = currentProjectId.value === project.id
  const wasPlaying = playingProjectId.value === project.id
  const programCtx = await programContexts.value.get(project.id)

  if (wasPlaying && programCtx && ctx.value) {
    ctx.value.dsp.stop([programCtx.program])
  }
  programCtx?.dispose()
  programContexts.value.delete(project.id)
  programContexts.value = new Map(programContexts.value)

  const remove = () => {
    localStorage.removeItem(project.id)
    localStorage.removeItem(`${project.id}-scratch`)

    batch(() => {
      projects.value = projects.value.filter(p => p.id !== project.id)

      if (wasCurrent || wasPlaying) {
        if (!projects.value.length) {
          projects.value = [createProject()]
        }
        const next = projects.value[0]
        requestAnimationFrame(() => {
          batch(() => {
            currentProjectId.value = next.id
            playingProjectId.value = next.id
          })
        })
      }
    })
  }

  if (project.serverId) {
    api.deleteProject(project.serverId).then(remove).catch(error => {
      console.error(error)
    })
  }
  else {
    remove()
  }

  api.deleteProject(project.id).then(remove).catch(error => {
    console.error(error)
  })
}

export function discardChanges(project: Project) {
  project.scratch.code = project.doc.code
}

export async function saveProject(project: Project, values: Partial<Project> = {}) {
  try {
    const result = await api.saveProject({ ...project, ...values })
    batch(() => {
      project.serverId = result.id
      if (values.name != null) project.name = values.name
      if (values.isPublic != null) project.isPublic = values.isPublic
      project.doc.code = project.scratch.code
      project.isSaved = true
    })
  }
  catch (error) {
    alert('Failed to save project: ' + (error as Error).message)
    console.error(error)
  }
}

persist('workspace', () => {
  mainPage.value
  sidebarTab.value
  currentProjectId.value
  Object.assign({}, settings)
}, () => ({
  mainPage: mainPage.value,
  sidebarTab: sidebarTab.value,
  sidebarOpen: sidebarOpen.value,
  currentProjectId: currentProjectId.value,
  settings,
}), data => {
  skipAnimations.value += 1
  mainPage.value = data.mainPage ?? 'browse'
  sidebarTab.value = data.sidebarTab ?? null
  currentProjectId.value = data.currentProjectId ?? null
  Object.assign(settings, data.settings ?? {})
})

effect(() => {
  if (currentProject.value && ctx.value) {
    ensureProgramContexts()
    untracked(() => {
      skipAnimations.value += 10
    })
    deferDraw.value = true
  }
})

effect(() => {
  currentProjectId.value
  requestAnimationFrame(() => {
    editor.value?.focus()
  })
})

effect(() => {
  ensureProgramContexts()
})

effect(() => {
  const handleKeyDown = (e: KeyboardEvent): boolean => {
    if (autocompleteState.visible) {
      const { matches, selectedIndex, replaceStart, replaceEnd, doc } = autocompleteState
      if (e.key === 'Tab') {
        const next = selectedIndex < 0
          ? (e.shiftKey ? matches.length - 1 : 0)
          : (e.shiftKey
            ? (selectedIndex - 1 + matches.length) % matches.length
            : (selectedIndex + 1) % matches.length)
        autocompleteState.selectedIndex = next
        e.preventDefault()
        return true
      }
      if (e.key === 'Enter') {
        if (selectedIndex < 0) return false
        const ed = activeEditor.value
        const d = doc
        if (ed && d && matches.length > 0) {
          const idx = (selectedIndex % matches.length + matches.length) % matches.length
          const word = matches[idx]!
          const caretBefore = { line: ed.caret.line.value, column: ed.caret.column.value }
          const caretAfter = { line: replaceStart.line, column: replaceStart.column + word.length }
          d.buffer.replaceSelection(replaceStart, replaceEnd, word, undefined, caretBefore, undefined, caretAfter)
          ed.caret.line.value = caretAfter.line
          ed.caret.column.value = caretAfter.column
        }
        autocompleteState.visible = false
        e.preventDefault()
        return true
      }
      if (e.key === 'Escape') {
        autocompleteState.visible = false
        return false
      }
    }
    if (e.altKey) {
      if (e.key === 'k') {
        settings.showKnobs = !settings.showKnobs
        return true
      }
      else if (e.key === 'i') {
        settings.showVisuals = !settings.showVisuals
        return true
      }
      else if (e.key === 'o') {
        settings.showDocs = !settings.showDocs
        return true
      }
      else if (e.key === 'p') {
        settings.wordWrap = !settings.wordWrap
        return true
      }
      else if (e.key === 'l') {
        toggleAnalyserType()
        return true
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      if (e.altKey) {
        transport.restart()
      }
      else if (e.shiftKey) {
        transport.pause()
      }
      else {
        if (isPlaying.value) {
          transport.stop()
        }
        else {
          transport.start()
        }
      }
      return true
    }
    return false
  }
  onKeyOverride(handleKeyDown)
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
})

export const bytecode = computed(() => {
  const bytecode = currentProgramContext.value?.result.value?.compile.bytecode
  if (!bytecode) return ['[nothing yet...]']
  return disassembleBytecode(bytecode)
})

export const waveFFT = signal<{
  fft: WaveFFT
  window: Float32Array
  windowed: Float32Array
} | null>(null)

const fftSize = 8192
const fft = new WaveFFT(fftSize)
fft.init().then(() => {
  waveFFT.value = {
    fft,
    window: WaveFFT.blackman(fftSize),
    windowed: new Float32Array(fftSize),
  }
})

export function toggleAnalyserType() {
  settings.analyserType = settings.analyserType === 'waveform'
    ? 'spectrum'
    : settings.analyserType === 'spectrum'
    ? 'amplitude'
    : 'waveform'
}

export const showIntro = signal(true)

export const bpm = computed(() => currentProgramContext.value?.result.value?.compile.bpm ?? 120)
export const audioContext = computed(() => ctx.value?.dsp.state.audioContext ?? null)

export const userProjectsCount = signal(0)

export const cacheBust = signal<number>(safeJsonParse(localStorage.getItem('cacheBust')) || 0)
effect(() => {
  localStorage.setItem('cacheBust', JSON.stringify(cacheBust.value))
})

export const browseProjects = signal<Projects | null>(null)

export const widgetOptions = signalify({
  showVisuals: true,
  showKnobs: true,
  noHeader: false,
})

export const docsSearch = signal<string>('')

export const admin = signalify({
  editDocs: false,
})

persist('admin', () => {
  Object.assign({}, admin)
}, () => ({
  admin: Object.assign({}, admin),
}), data => {
  Object.assign(admin, data.admin ?? {})
})

export const favIconSvgText = signal('')

export const shouldSkipSyncPreview = signal(false)
const restoreSyncPreview = debounce(100, () => {
  shouldSkipSyncPreview.value = false
})
export function skipSyncPreview() {
  shouldSkipSyncPreview.value = true
  restoreSyncPreview()
}

export const aiTemperature = signal(0.3)
export const aiTopP = signal(1.0)
export const aiModel = signal('gpt-5.2-chat-latest')
export const aiPromptNew = signal('')
export const aiPromptModify = signal('')

persist('ai', () => {
  aiTemperature.value
  aiTopP.value
  aiModel.value
  aiPromptNew.value
  aiPromptModify.value
}, () => ({
  aiTemperature: aiTemperature.value,
  aiTopP: aiTopP.value,
  aiModel: aiModel.value,
  aiPromptNew: aiPromptNew.value,
  aiPromptModify: aiPromptModify.value,
}), data => {
  aiTemperature.value = data.aiTemperature ?? 0.3
  aiTopP.value = data.aiTopP ?? 1.0
  aiModel.value = data.aiModel ?? 'gpt-5.2-chat-latest'
  aiPromptNew.value = data.aiPromptNew ?? ''
  aiPromptModify.value = data.aiPromptModify ?? ''
})

effect(() => {
  const labels = [...(playingProgramContext.value?.result.value?.compile?.labels ?? [])]
  const end = labels.find(l => l.text.toLowerCase() === 'end')
  if (end) {
    transport.setProjectEndSamples(
      Math.round(
        end.bar * BEATS_PER_BAR * 60 / bpm.value
          * (playingProgramContext.value?.latency.value.state.sampleRate || 44100),
      ),
    )
  }
  else {
    transport.setProjectEndSamples(0)
  }
})
