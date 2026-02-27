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
  'let',
  'const',
  'var',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'return',
  'function',
  'async',
  'await',
  'class',
  'extends',
  'import',
  'export',
  'from',
  'default',
  'try',
  'catch',
  'finally',
  'throw',
  'new',
  'this',
  'super',
  'typeof',
  'instanceof',
  'in',
  'of',
  'with',
  'void',
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  'type',
  'interface',
  'enum',
  'namespace',
  'declare',
  'as',
  'is',
  'satisfies',
  'keyof',
  'readonly',
  'abstract',
  'implements',
  'private',
  'protected',
  'public',
  'static',
  'override',
  'module',
  'global',
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

export const tokenize: Tokenizer = (input: string) => {
  const lines: Token[][] = []
  let currentLine: Token[] = []
  let i = 0
  const n = input.length
  let lineNum = 1
  let column = 1

  while (i < n) {
    const code = input.charCodeAt(i)
    const startLine = lineNum
    const startColumn = column

    if (code === codeDollar) {
      currentLine.push({ text: '$', type: 'special', line: startLine, column: startColumn })
      i++
      column++
      continue
    }

    if (isWhitespaceCode(code)) {
      let segStart = i
      let segLine = lineNum
      let segColumn = column
      while (i < n && isWhitespaceCode(input.charCodeAt(i))) {
        if (input.charCodeAt(i) === codeLf) {
          if (segStart < i) {
            currentLine.push({
              text: input.slice(segStart, i),
              type: 'text',
              line: segLine,
              column: segColumn,
            })
          }
          lines.push(currentLine)
          currentLine = []
          i++
          lineNum++
          column = 1
          segStart = i
          segLine = lineNum
          segColumn = column
        }
        else {
          i++
          column++
        }
      }
      if (segStart < i) {
        currentLine.push({
          text: input.slice(segStart, i),
          type: 'text',
          line: segLine,
          column: segColumn,
        })
      }
      continue
    }

    if (code === codeSlash && input.charCodeAt(i + 1) === codeSlash) {
      const start = i
      const end = input.indexOf('\n', i + 2)
      i = end === -1 ? n : end
      column += i - start
      currentLine.push({
        text: input.slice(start, i),
        type: 'comment',
        line: startLine,
        column: startColumn,
      })
      continue
    }

    if (code === codeSlash && input.charCodeAt(i + 1) === codeStar) {
      let segStart = i
      i += 2
      column += 2
      while (i < n) {
        const c = input.charCodeAt(i)
        if (c === codeLf) {
          currentLine.push({
            text: input.slice(segStart, i + 1),
            type: 'comment',
            line: startLine,
            column: startColumn,
          })
          lines.push(currentLine)
          currentLine = []
          i++
          lineNum++
          column = 1
          segStart = i
          continue
        }
        if (c === codeStar && input.charCodeAt(i + 1) === codeSlash) {
          i += 2
          column += 2
          currentLine.push({
            text: input.slice(segStart, i),
            type: 'comment',
            line: startLine,
            column: startColumn,
          })
          segStart = i
          break
        }
        i++
        column++
      }
      if (segStart < i) {
        currentLine.push({
          text: input.slice(segStart, i),
          type: 'comment',
          line: startLine,
          column: startColumn,
        })
      }
      continue
    }

    if (code === codeBacktick || code === codeSingleQuote || code === codeDoubleQuote) {
      const quote = code
      let segStart = i
      i++
      column++
      let escaped = false
      while (i < n) {
        const c = input.charCodeAt(i)
        if (escaped) {
          escaped = false
          i++
          column++
        }
        else if (c === codeBackslash) {
          escaped = true
          i++
          column++
        }
        else if (c === codeLf) {
          currentLine.push({
            text: input.slice(segStart, i + 1),
            type: 'string',
            line: startLine,
            column: startColumn,
          })
          lines.push(currentLine)
          currentLine = []
          i++
          lineNum++
          column = 1
          segStart = i
        }
        else {
          i++
          column++
          if (c === quote) {
            currentLine.push({
              text: input.slice(segStart, i),
              type: 'string',
              line: startLine,
              column: startColumn,
            })
            segStart = i
            break
          }
        }
      }
      if (segStart < i) {
        currentLine.push({
          text: input.slice(segStart, i),
          type: 'string',
          line: startLine,
          column: startColumn,
        })
      }
      continue
    }

    if (isDigitCode(code) || (code === codeDot && isDigitCode(input.charCodeAt(i + 1)))) {
      const start = i

      if (code === codeDot) {
        i++
        while (i < n && isDigitCode(input.charCodeAt(i))) i++
      }
      else {
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

      currentLine.push({
        text: input.slice(start, i),
        type: 'number',
        line: startLine,
        column: startColumn,
      })
      column += i - start
      continue
    }

    const ops = operatorsByFirstChar.get(code)
    if (ops) {
      let matched = false
      for (const op of ops) {
        if (input.startsWith(op, i)) {
          currentLine.push({ text: op, type: 'operator', line: startLine, column: startColumn })
          i += op.length
          column += op.length
          matched = true
          break
        }
      }
      if (matched) continue
    }

    if (isPunctuationCode(code)) {
      currentLine.push({ text: input[i]!, type: 'punctuation', line: startLine, column: startColumn })
      i++
      column++
      continue
    }

    if (isLetterCode(code) || code === codeHash) {
      const start = i
      i++
      while (i < n && isIdentifierCode(input.charCodeAt(i))) i++

      const identifier = input.slice(start, i)
      column += i - start

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
      else if (i < n && input.charCodeAt(i) === codeLParen) {
        type = 'function'
      }

      currentLine.push({ text: identifier, type, line: startLine, column: startColumn })
      continue
    }

    currentLine.push({ text: input[i]!, type: 'text', line: startLine, column: startColumn })
    i++
    column++
  }

  lines.push(currentLine)

  return lines
}
