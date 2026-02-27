import { activeEditor, type DocError } from 'editor'
import type { ControlCompileSnapshot, Loc } from 'engine'
import { signalify } from './signalify.ts'

export function formatErrors(errors: { message: string; loc: Loc }[]): DocError[] {
  return errors.map(e => {
    const { line, column, start, end } = e.loc
    const length = end - start
    const x = [column, column + length] as [start: number, end: number]
    const y = line
    return {
      x,
      y,
      message: e.message,
    }
  })
}

export function computeDocErrors(
  result: ControlCompileSnapshot | null,
  runtimeError?: string | null | undefined,
): DocError[] {
  const compileErrors = result?.errors.length
    ? formatErrors([
      ...result.lex.errors,
      ...result.parse.errors,
      ...result.compile.errors,
    ])
    : []

  if (runtimeError != null) {
    const caret = activeEditor.value?.caret
    if (caret) {
      const error: DocError = signalify({
        get x(): [start: number, end: number] {
          return [caret.column.value + 1, caret.column.value + 1]
        },
        get y() {
          return caret.line.value + 1
        },
        message: runtimeError,
      })
      compileErrors.push(error)
    }
  }

  return compileErrors
}
