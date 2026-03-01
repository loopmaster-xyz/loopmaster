import { batch, type Signal, untracked, useComputed, useSignal } from '@preact/signals'
import { createDoc, createEditor, createPersistedDoc, type Doc } from 'editor'
import { useEffect, useMemo, useRef } from 'preact/hooks'
import { isMobile } from 'utils/is-mobile'
import { MouseButton } from 'utils/mouse-buttons'
import { luminate } from 'utils/rgb'
import type { DspProgramContext } from '../dsp.ts'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import { cn } from '../lib/cn.ts'
import { createEditorOnHover, editorSettings } from '../lib/editor-common.ts'
import { tokenize } from '../lib/tokenizer.ts'
import { ctx, getProgramContext, inlineTransport, playingContext, playingInlineContext, theme } from '../state.ts'
import { PlayGradientIcon, StopGradientIcon } from './Icons.tsx'

export const InlineEditor = (
  { code, doc, id, ready, header = null, headerHeight = 0, autoHeight = true, showGutter = true, persisted = true,
    class: className = '' }: {
      code?: string
      doc?: Doc
      id: string
      ready?: Signal<boolean>
      header?: ((inner?: preact.ComponentChildren) => preact.ComponentChildren) | null
      headerHeight?: number
      autoHeight?: boolean
      showGutter?: boolean
      persisted?: boolean
      class?: string
    },
) => {
  const ref = useRef<HTMLDivElement>(null)

  const inline = useSignal<DspProgramContext | null>(null)
  const waveBackground = useSignal(theme.value.black)
  const hasOut = useComputed(() => inline.value?.doc.code.includes('out('))
  const inView = useSignal(false)
  const didInit = useSignal(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) inView.value = true
      },
      { rootMargin: '300px', delay: 100 } as IntersectionObserverInit & { delay: number },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  useReactiveEffect(() => {
    if (!ctx.value || !inView.value) return

    getProgramContext(ctx.value, id, {
      doc: doc ?? (persisted ? createPersistedDoc(id, tokenize) : createDoc(tokenize)),
      waveBackground,
    }).then(instance => {
      if (doc) code = doc.code ?? ''
      code ??= ''
      const lines = code.split('\n')
      if (lines.at(-1)?.length === 0) lines.pop()
      batch(() => {
        inline.value = instance
        inline.value.doc.code ||= lines.join('\n')
        inline.value.fullResync.value = true
        if (ready) {
          setTimeout(() => {
            ready.value = true
          }, 1000)
        }
      })
    })
  }, [ctx])

  const estimatedHeight = useComputed(() => {
    if (code) {
      const lines = code.split('\n')
      if (lines.at(-1)?.length === 0) lines.pop()
      return lines.length * editorSettings.lineHeight + 30
    }
    else return 0
  })

  const editor = useMemo(() =>
    inView.value
      ? createEditor({
        wordWrap: false,
        autoHeight,
        paddingTop: 15,
        paddingLeft: isMobile() || !showGutter ? 15 : 5,
        paddingRight: isMobile() || !showGutter ? 15 : 12,
        paddingBottom: 15,
        ...editorSettings,
        showGutter,
      })
      : null, [autoHeight, inView.value])

  useReactiveEffect(() => {
    if (!inline.value || !editor) return
    untracked(() => {
      if (inline.value) editor.setDoc(inline.value.doc)
    })
  }, [editor])

  useReactiveEffect(() => {
    if (!inline.value) return
    if (doc) code = doc.code ?? ''
    inline.value.doc.code = code ?? ''
    inline.value.fullResync.value = true
    didInit.value = true
  }, [code, inline])

  useReactiveEffect(() => {
    if (!ctx.value || !inline.value || playingContext.value !== inline.value || !editor) return
    ctx.value.historiesRefreshed.value
    untracked(() => {
      if (inline.value) editor.setDoc(inline.value.doc)
    })
  }, [editor])

  const bgColor = useComputed(() => {
    return luminate(theme.value.black, 0.04)
  })

  useReactiveEffect(() => {
    if (!editor) return
    Object.assign(editor.settings.colors, {
      ...theme.value,
      black: bgColor.value,
    })
  }, [editor])

  useReactiveEffect(() => {
    if (!editor) return
    createEditorOnHover(editor, () => inline.value)
  }, [editor])

  useEffect(() => {
    if (ref.current && editor) {
      requestAnimationFrame(() => {
        if (ref.current) ref.current.appendChild(editor.canvas)
      })
    }
  }, [ref, editor])

  const isCurrentPlaying = useComputed(() => inline.value !== null && playingInlineContext.value === inline.value)

  useEffect(() => () => editor?.dispose(), [editor])

  const PlayButton = () => (
    <button
      class={cn('group flex px-3 py-2 active:hover:scale-95 outline-none focus:bg-white/5', {
        'absolute right-0': isMobile() && header,
      })}
      onMouseDown={async e => {
        e.preventDefault()
        e.stopPropagation()
        if (!ctx.value) return
        if (!inline.value) return

        if (isCurrentPlaying.value) {
          await inlineTransport.stop()
          return
        }

        const shouldRestart = playingInlineContext.value === inline.value
          && ((e.ctrlKey || e.metaKey) || e.button === MouseButton.Right)

        if (shouldRestart) {
          await inlineTransport.restart()
        }
        else {
          await inlineTransport.start(inline.value)
        }
      }}
    >
      {isCurrentPlaying.value ? <StopGradientIcon size={24} /> : <PlayGradientIcon size={24} />}
    </button>
  )

  return (
    <div class={`bg-[${bgColor.value}] ${className} relative`}
      style={code && !didInit.value && { height: estimatedHeight.value + 'px' } || {}}
    >
      {(!header || !isMobile()) && hasOut.value && (
        <div
          class={cn('mb-0 flex flex-row absolute ', {
            'top-[4px] right-[calc(100%-2px)]': !isMobile(),
            'right-0 bottom-0 translate-y-[100%]': isMobile(),
          })}
        >
          <PlayButton />
        </div>
      )}
      {header?.(isMobile() ? <PlayButton /> : undefined)}
      <div ref={ref} class={autoHeight ? 'w-full' : `w-full h-[calc(100%-${headerHeight}px)]`} />
    </div>
  )
}
