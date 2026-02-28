import { computed, useSignal } from '@preact/signals'
import { draw, type Header } from 'editor'
import { memoryDebug } from 'engine'
import { useEffect } from 'preact/hooks'
import { isMobile } from 'utils/is-mobile'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import { setFaviconSvg } from '../lib/set-favicon-svg.ts'
import { settings } from '../settings.ts'
import {
  ctx,
  currentProgramContext,
  deferDraw,
  favIconSvgText,
  mainPage,
  memoryDebugInfo,
  primaryGradientA,
  primaryGradientB,
  showIntro,
  skipAnimations,
  theme,
  tickCount,
  wasmMemoryUsage,
} from '../state.ts'
import { createHeader } from '../widgets/header.ts'
import { AboutMain } from './AboutMain.tsx'
import { AdminMain } from './AdminMain.tsx'
import { ArtistMain } from './ArtistMain.tsx'
import { BrowseMain } from './BrowseMain.tsx'
import { DJMain } from './DJMain.tsx'
import { DocsMain } from './DocsMain.tsx'
import { Editor } from './Editor.tsx'
import { HelpMain } from './HelpMain.tsx'
import { Intro } from './Intro.tsx'
import { Landing } from './Landing.tsx'
import { Nav } from './Nav.tsx'
import { ProjectMain } from './ProjectMain.tsx'
import { Sidebar } from './Sidebar.tsx'
import { TutorialsMain } from './TutorialsMain.tsx'

export const App = () => {
  const header = useSignal<Header | null>(null)

  useEffect(() => () => ctx.value?.dispose(), [])

  useReactiveEffect(() => {
    if (!settings.debug) return

    const c = ctx.value
    if (!c?.dsp?.core?.worklet) {
      memoryDebugInfo.value = null
      return
    }
    const id = setInterval(async () => {
      try {
        const s = await c.dsp.core.worklet.getStats()
        wasmMemoryUsage.value = (s.memoryUsage as number) ?? null
        const info = await memoryDebug.getInfo({
          worklet: c.dsp.core.worklet,
          record: c.dsp.core.record,
        })
        memoryDebugInfo.value = info
      }
      catch (e) {
        console.error(e)
      }
    }, 250)
    return () => {
      clearInterval(id)
      memoryDebugInfo.value = null
    }
  })

  useReactiveEffect(() => {
    setFaviconSvg(favIconSvgText.value)
  }, [favIconSvgText])

  useReactiveEffect(() => {
    favIconSvgText.value = `
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="1362" height="1362" viewBox="0 -150 1362 1362">
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2=".75" y2=".75">
            <stop offset="0%" stop-color="${primaryGradientA.value}" />
            <stop offset="100%" stop-color="${primaryGradientB.value}" />
          </linearGradient>
        </defs>
        <path
          d="M0,0 L111,0 L112,610 L124,630 L136,649 L152,675 L156,681 L236,682 L236,806 L101,806 L80,774 L61,745 L42,716 L23,687 L4,658 L0,652 Z "
          fill="url(#gradient)"
          transform="translate(107,104)"
        />
        <path
          d="M0,0 L255,0 L266,51 L285,141 L285,145 L287,145 L288,136 L316,3 L317,0 L573,0 L584,14 L594,27 L604,40 L618,58 L631,75 L645,93 L655,106 L665,119 L675,132 L689,150 L690,152 L690,551 L567,551 L566,191 L555,177 L543,162 L532,148 L521,134 L512,123 L512,121 L402,121 L401,129 L367,283 L339,409 L338,413 L235,413 L221,352 L196,241 L170,126 L170,121 L61,122 L50,136 L39,150 L28,164 L17,178 L7,191 L6,551 L-118,551 L-118,151 L-105,135 L-93,119 L-81,104 L-71,91 L-60,77 L-46,59 L-35,45 L-21,27 L-7,9 Z "
          fill="url(#gradient)"
          transform="translate(554,359)"
        />
      </svg>
    `
  }, [])

  useReactiveEffect(() => {
    if (!ctx.value) return
    header.value = createHeader(ctx.value, currentProgramContext.value)
  })

  useEffect(() => {
    let rafId: ReturnType<typeof requestAnimationFrame>
    const tick = () => {
      tickCount.value++
      if (deferDraw.value) {
        deferDraw.value = false
        skipAnimations.value += 1
        requestAnimationFrame(() => {
          rafId = requestAnimationFrame(tick)
        })
      }
      else {
        draw()
        if (skipAnimations.value) skipAnimations.value--
        rafId = requestAnimationFrame(tick)
      }
    }
    tick()
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *::selection {
          background-color: ${theme.value.blue + '42'};
        }
    ` }} />
      {mainPage.value === null ? <Landing /> : (
        <>
          <div class="flex flex-row w-screen h-screen max-w-full max-h-full"
            style={{ backgroundColor: theme.value.black }}
          >
            {!isMobile() && (
              <div class="flex w-auto h-full flex-shrink-0">
                <Sidebar />
              </div>
            )}
            <div class="flex flex-col flex-1 min-w-0 h-full">
              {mainPage.value === 'docs'
                ? <DocsMain />
                : mainPage.value === 'tutorials'
                ? <TutorialsMain />
                : mainPage.value === 'browse'
                ? <BrowseMain />
                : mainPage.value === 'admin'
                ? <AdminMain />
                : mainPage.value === 'artist'
                ? <ArtistMain />
                : mainPage.value === 'project'
                ? <ProjectMain />
                : mainPage.value === 'help'
                ? <HelpMain />
                : mainPage.value === 'about'
                ? <AboutMain />
                : mainPage.value === 'dj'
                ? <DJMain />
                : mainPage.value === 'editor'
                ? (
                  <>
                    <div class="relative">
                      <Nav />
                    </div>
                    {currentProgramContext.value?.doc && (
                      <div class="flex-1 min-w-0 h-full overflow-hidden">
                        <Editor
                          doc={computed(() => currentProgramContext.value?.doc ?? null)}
                          header={header.value}
                        />
                      </div>
                    )}
                  </>
                )
                : null}
            </div>
            {showIntro.value && <Intro />}
          </div>
        </>
      )}
      {((wasmMemoryUsage.value != null) || memoryDebugInfo.value) && settings.debug && (
        <div class="fixed bottom-3 right-3 text-xs font-mono px-2 py-1 rounded z-50 text-white bg-black/70">
          {wasmMemoryUsage.value != null && <div>WASM worklet: {wasmMemoryUsage.value.toFixed(2)} MB</div>}
          {memoryDebugInfo.value?.record?.wasmMemoryMb != null && (
            <div>WASM record: {memoryDebugInfo.value.record.wasmMemoryMb.toFixed(2)} MB</div>
          )}
          {memoryDebugInfo.value && (
            <div class="mt-1">
              <div>SAB: {(memoryDebugInfo.value.sab.totalBytes / 1024 / 1024).toFixed(2)} MB</div>
              <div>
                samples: {memoryDebugInfo.value.samples.handleCount}{' '}
                ({((memoryDebugInfo.value.samples.totalChannelBytes) / 1024).toFixed(0)} KB)
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
