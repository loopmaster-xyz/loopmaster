import { type Signal, untracked } from '@preact/signals'
import {
  createEditor,
  type Doc,
  type Header,
} from 'editor'
import { useEffect, useMemo, useRef } from 'preact/hooks'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import { createEditorOnHover, editorSettings } from '../lib/editor-common.ts'
import { settings } from '../settings.ts'
import { editor as stateEditor, theme, widgetOptions } from '../state.ts'

export const Editor = ({ doc, header }: { doc: Signal<Doc | null>; header: Header | null }) => {
  widgetOptions.showVisuals = settings.showVisuals
  widgetOptions.showKnobs = settings.showKnobs
  widgetOptions.noHeader = false

  const ref = useRef<HTMLDivElement>(null)

  const editor = stateEditor.value = useMemo(() =>
    createEditor({
      wordWrap: true,
      autoHeight: false,
      paddingLeft: 5,
      paddingTop: !header ? 15.5 : 17,
      paddingRight: 12,
      paddingBottom: !header ? 15.5 : 17,
      ...editorSettings,
    }), [])

  useEffect(() => {
    editor.header = header
  }, [editor, header])

  useEffect(() => {
    editor.focus()
  }, [editor])

  useReactiveEffect(() => {
    if (doc.value) {
      untracked(() => {
        if (doc.value) editor.setDoc(doc.value)
      })
    }
  }, [editor])

  useReactiveEffect(() => {
    Object.assign(editor.settings.colors, theme.value)
  }, [editor])

  useReactiveEffect(() => {
    createEditorOnHover(editor)
  }, [editor])

  useReactiveEffect(() => {
    editor.settings.wordWrap = settings.wordWrap
  }, [editor])

  useEffect(() => {
    if (ref.current) {
      ref.current.appendChild(editor.canvas)
      editor.canvas.focus()
    }
  }, [ref, editor])

  useEffect(() => () => editor.dispose(), [])

  return <div ref={ref} class="w-full h-full" />
}
