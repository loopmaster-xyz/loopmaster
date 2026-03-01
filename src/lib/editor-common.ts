import type { Editor, EditorSettings } from 'editor'
import { isMobile } from 'utils/is-mobile'
import type { DspProgramContext } from '../dsp.ts'
import { createDefinitionTooltipHandlers } from './definition-tooltip.ts'

export const editorSettings = {
  showGutter: !isMobile(),
  lineHeight: isMobile() ? 14 : 18,
  fontSize: isMobile() ? '8pt' : '11.5pt',
  colors: {
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#e6db74',
    blue: '#66d9ef',
    purple: '#ae81ff',
    cyan: '#38ccd1',
    white: '#f8f8f2',
    gray: '#75715e',
    brightBlack: '#272822',
    brightRed: '#fd5ff1',
    brightGreen: '#a1efe4',
    brightYellow: '#ffd866',
    brightBlue: '#66d9ef',
    brightPurple: '#ae81ff',
    brightCyan: '#a1efe4',
    brightWhite: '#f9f8f5',
  },
  syntax: c => ({
    keyword: { color: c.blue, style: 'italic', weight: 'regular' },
    function: { color: c.green, style: 'normal', weight: 'regular' },
    identifier: { color: c.white, style: 'normal', weight: 'regular' },
    string: { color: c.yellow, style: 'normal', weight: 'regular' },
    number: { color: c.purple, style: 'normal', weight: 'regular' },
    boolean: { color: c.red, style: 'normal', weight: 'regular' },
    null: { color: c.blue, style: 'normal', weight: 'regular' },
    operator: { color: c.red, style: 'normal', weight: 'regular' },
    punctuation: { color: c.cyan, style: 'normal', weight: 'regular' },
    comment: { color: c.gray, style: 'normal', weight: 'regular' },
    text: { color: c.white, style: 'normal', weight: 'regular' },
    special: { color: c.red, style: 'normal', weight: 'bold' },
  }),
} satisfies Partial<EditorSettings>

export const createEditorOnHover = (editor: Editor, getInline?: () => DspProgramContext | null | undefined) => {
  const { onHoverToken, onCaretToken } = createDefinitionTooltipHandlers(editor, getInline)
  editor.onHoverToken = onHoverToken
  editor.onCaretToken = onCaretToken
}
