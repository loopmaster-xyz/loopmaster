import type { Token as EditorToken, TokenType } from 'editor'
import { theme } from '../state.ts'
import { tokenize } from './tokenizer.ts'

const tokenColor = (type: TokenType): string => {
  const c = theme.value
  return {
    keyword: c.blue,
    function: c.green,
    identifier: c.white,
    string: c.yellow,
    number: c.purple,
    boolean: c.red,
    null: c.blue,
    operator: c.red,
    punctuation: c.cyan,
    comment: c.gray,
    text: c.white,
    special: c.red,
  }[type]
}

export const SignatureView = (
  { code, class: className, style = {} }: { code: string; class?: string; style?: preact.CSSProperties },
) => {
  const lines = tokenize(code)
  return (
    <span class={className} style={style}>
      {lines.flatMap((lineTokens: EditorToken[], i) =>
        lineTokens.map((t: EditorToken, j) => (
          <span key={`${i}-${j}`} style={{ color: tokenColor(t.type) }}>
            {t.text}
          </span>
        ))
      )}
    </span>
  )
}
