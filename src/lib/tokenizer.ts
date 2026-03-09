import type { Token, Tokenizer, TokenType } from 'editor'

const codeDollar = 36
const codeHash = 35
const codeUnderscore = 95
const codeBackslash = 92
const codeLf = 10
const codeCr = 13
const codeTab = 9
const codeVt = 11
const codeFf = 12
const codeSpace = 32
const codeSlash = 47
const codeStar = 42
const codeSingleQuote = 39
const codeDoubleQuote = 34
const codeBacktick = 96
const codeDot = 46
const codeLParen = 40
const codePlus = 43
const codeMinus = 45
const codeLowerE = 101
const codeUpperE = 69
const codeLowerK = 107

const keywords = new Set([
  'undefined',
  'if',
  'else',
  'for',
  'in',
  'of',
  'switch',
  'case',
  'break',
  'throw',
  'try',
  'catch',
  'finally',
  'true',
  'false',
  'return',
  'default',
  'while',
  'do',
])

const operators = new Set([
  '|>',
  '->',
  '->>',
  '-->',
  '<-',
  '<<-',
  '<-->',
  '=>',
  '==>',
  '<=>',
  '<=',
  '>=',
  '<|',
  '<~',
  '~>',
  '<~>',
  '~~>',
  '<->',
  '==',
  '===',
  '!=',
  '!==',
  '<>',
  '<+',
  '+=',
  '-=',
  '*=',
  '/=',
  '**',
  '**=',
  '++',
  '--',
  '-+',
  '+-',
  '&&',
  '||',
  '!!',
  '&=',
  '|=',
  '^=',
  '~=',
  '=',
  '::',
  ':::',
  '|->',
  '|',
  '...',
  '..',
  '..<',
  '..<.',
  '!!!',
  '~~~',
  '<*>',
  '<$>',
  '<$!>',
  '+++',
  '^^',
  '+',
  '-',
  '*',
  '/',
  '%',
  '&',
  '|',
  '^',
  '~',
  '!',
  '<',
  '>',
  '?',
  ':',
])

const operatorsByFirstChar = new Map<number, string[]>()
for (const op of operators) {
  const first = op.charCodeAt(0)
  const list = operatorsByFirstChar.get(first)
  if (list) list.push(op)
  else operatorsByFirstChar.set(first, [op])
}
for (const [first, list] of operatorsByFirstChar) {
  list.sort((a, b) => b.length - a.length)
  operatorsByFirstChar.set(first, list)
}

function isWhitespaceCode(code: number): boolean {
  return (
    code === codeSpace
    || code === codeTab
    || code === codeLf
    || code === codeCr
    || code === codeVt
    || code === codeFf
  )
}

function isDigitCode(code: number): boolean {
  return code >= 48 && code <= 57
}

function isLetterCode(code: number): boolean {
  return (
    (code >= 65 && code <= 90)
    || (code >= 97 && code <= 122)
    || code === codeUnderscore
  )
}

function isIdentifierCode(code: number): boolean {
  return (
    isLetterCode(code)
    || isDigitCode(code)
    || code === codeDollar
    || code === codeHash
  )
}

function isPunctuationCode(code: number): boolean {
  switch (code) {
    case 40: // (
    case 41: // )
    case 91: // [
    case 93: // ]
    case 123: // {
    case 125: // }
    case 46: // .
    case 44: // ,
    case 59: // ;
    case 58: // :
      return true
    default:
      return false
  }
}

const MODE_NORMAL = 0
const MODE_BLOCK_COMMENT = 1
const MODE_SINGLE_QUOTE = 2
const MODE_DOUBLE_QUOTE = 3
const MODE_BACKTICK = 4

function decodeMode(prevState: unknown): number {
  const mode = typeof prevState === 'number' ? prevState : MODE_NORMAL
  if (mode < MODE_NORMAL || mode > MODE_BACKTICK) return MODE_NORMAL
  return mode
}

function quoteFromMode(mode: number): number {
  if (mode === MODE_SINGLE_QUOTE) return codeSingleQuote
  if (mode === MODE_DOUBLE_QUOTE) return codeDoubleQuote
  if (mode === MODE_BACKTICK) return codeBacktick
  return 0
}

function modeFromQuote(quoteCode: number): number {
  if (quoteCode === codeSingleQuote) return MODE_SINGLE_QUOTE
  if (quoteCode === codeDoubleQuote) return MODE_DOUBLE_QUOTE
  if (quoteCode === codeBacktick) return MODE_BACKTICK
  return MODE_NORMAL
}

function tokenizeLineInternal(
  input: string,
  lineIndex: number,
  prevState: unknown,
): { tokens: Token[]; state: number } {
  const tokens: Token[] = []
  const line = lineIndex + 1
  const n = input.length
  let i = 0
  let mode = decodeMode(prevState)

  if (mode === MODE_BLOCK_COMMENT) {
    const startColumn = 1
    let closed = false
    while (i < n) {
      if (input.charCodeAt(i) === codeStar && input.charCodeAt(i + 1) === codeSlash) {
        i += 2
        closed = true
        break
      }
      i++
    }
    tokens.push({ text: input.slice(0, i), type: 'comment', line, column: startColumn })
    if (!closed) {
      return { tokens, state: MODE_BLOCK_COMMENT }
    }
    mode = MODE_NORMAL
  }
  else if (mode !== MODE_NORMAL) {
    const quote = quoteFromMode(mode)
    const startColumn = 1
    let escaped = false
    let closed = false
    while (i < n) {
      const c = input.charCodeAt(i)
      if (escaped) {
        escaped = false
        i++
        continue
      }
      if (c === codeBackslash) {
        escaped = true
        i++
        continue
      }
      i++
      if (c === quote) {
        closed = true
        break
      }
    }
    tokens.push({ text: input.slice(0, i), type: 'string', line, column: startColumn })
    if (!closed) {
      return { tokens, state: mode }
    }
    mode = MODE_NORMAL
  }

  while (i < n) {
    const start = i
    const startColumn = i + 1
    const code = input.charCodeAt(i)

    if (code === codeDollar) {
      tokens.push({ text: '$', type: 'special', line, column: startColumn })
      i++
      continue
    }

    if (isWhitespaceCode(code)) {
      i++
      while (i < n && isWhitespaceCode(input.charCodeAt(i))) i++
      tokens.push({ text: input.slice(start, i), type: 'text', line, column: startColumn })
      continue
    }

    if (code === codeSlash && input.charCodeAt(i + 1) === codeSlash) {
      tokens.push({ text: input.slice(i), type: 'comment', line, column: startColumn })
      break
    }

    if (code === codeSlash && input.charCodeAt(i + 1) === codeStar) {
      i += 2
      let closed = false
      while (i < n) {
        if (input.charCodeAt(i) === codeStar && input.charCodeAt(i + 1) === codeSlash) {
          i += 2
          closed = true
          break
        }
        i++
      }
      tokens.push({ text: input.slice(start, i), type: 'comment', line, column: startColumn })
      if (!closed) {
        mode = MODE_BLOCK_COMMENT
        break
      }
      continue
    }

    if (code === codeBacktick || code === codeSingleQuote || code === codeDoubleQuote) {
      const quote = code
      i++
      let escaped = false
      let closed = false
      while (i < n) {
        const c = input.charCodeAt(i)
        if (escaped) {
          escaped = false
          i++
          continue
        }
        if (c === codeBackslash) {
          escaped = true
          i++
          continue
        }
        i++
        if (c === quote) {
          closed = true
          break
        }
      }
      tokens.push({ text: input.slice(start, i), type: 'string', line, column: startColumn })
      if (!closed) {
        mode = modeFromQuote(quote)
        break
      }
      continue
    }

    if (isDigitCode(code) || (code === codeDot && isDigitCode(input.charCodeAt(i + 1)))) {
      if (code === codeDot) {
        i++
        while (i < n && isDigitCode(input.charCodeAt(i))) i++
      }
      else {
        i++
        while (i < n && isDigitCode(input.charCodeAt(i))) i++
        if (input.charCodeAt(i) === codeDot && isDigitCode(input.charCodeAt(i + 1))) {
          i++
          while (i < n && isDigitCode(input.charCodeAt(i))) i++
        }
      }

      const e = input.charCodeAt(i)
      if (e === codeLowerE || e === codeUpperE) {
        i++
        const sign = input.charCodeAt(i)
        if (sign === codePlus || sign === codeMinus) i++
        while (i < n && isDigitCode(input.charCodeAt(i))) i++
      }

      if (input.charCodeAt(i) === codeLowerK) i++

      tokens.push({ text: input.slice(start, i), type: 'number', line, column: startColumn })
      continue
    }

    const ops = operatorsByFirstChar.get(code)
    if (ops) {
      let matched = false
      for (const op of ops) {
        if (input.startsWith(op, i)) {
          tokens.push({ text: op, type: 'operator', line, column: startColumn })
          i += op.length
          matched = true
          break
        }
      }
      if (matched) continue
    }

    if (isPunctuationCode(code)) {
      tokens.push({ text: input[i]!, type: 'punctuation', line, column: startColumn })
      i++
      continue
    }

    if (isLetterCode(code) || code === codeHash) {
      i++
      while (i < n && isIdentifierCode(input.charCodeAt(i))) i++

      const identifier = input.slice(start, i)
      let type: TokenType = 'identifier'
      if (keywords.has(identifier)) {
        type = 'keyword'
      }
      else if (identifier === 'true' || identifier === 'false') {
        type = 'boolean'
      }
      else if (identifier === 'null' || identifier === 'undefined') {
        type = 'null'
      }
      else if (input.charCodeAt(i) === codeLParen) {
        type = 'function'
      }

      tokens.push({ text: identifier, type, line, column: startColumn })
      continue
    }

    tokens.push({ text: input[i]!, type: 'text', line, column: startColumn })
    i++
  }

  return { tokens, state: mode }
}

export const tokenizer: Tokenizer = {
  tokenizeLine(line: string, lineIndex: number, prevState: unknown) {
    return tokenizeLineInternal(line, lineIndex, prevState)
  },
}

export function tokenize(input: string): Token[][] {
  const lines = input.split('\n')
  const result: Token[][] = new Array(lines.length)
  let state = MODE_NORMAL
  for (let i = 0; i < lines.length; i++) {
    const lineResult = tokenizeLineInternal(lines[i] ?? '', i, state)
    result[i] = lineResult.tokens
    state = lineResult.state
  }
  return result
}
