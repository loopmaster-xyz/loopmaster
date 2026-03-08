import type { Expr, Loc, Stmt } from 'engine/src/live/ast.ts'
import { parseTokens } from 'engine/src/live/parser.ts'
import { tokenize } from 'engine/src/live/token.ts'
import { POST_SHADER_PRESETS, SHADER_INPUTS, SHADER_PRESETS } from './shader-presets.ts'

export type ShaderDirectiveName = 'vertex' | 'fragment' | 'shader' | 'postfragment' | 'postshader' | 'shaderinput'

export type ShaderDirectiveSources = {
  vertex: string | null
  fragment: string | null
  shader: string | null
  shaderinput: string | null
  postfragment: string | null
  postshader: string | null
}

export type ShaderDirectiveLocations = {
  vertex: Loc | null
  fragment: Loc | null
  shader: Loc | null
  shaderinput: Loc | null
  postfragment: Loc | null
  postshader: Loc | null
}

export type ShaderDirectiveDiagnostic = {
  message: string
  loc: Loc
}

export type PreparedShaderSource = {
  sanitizedSource: string
  shaderSources: ShaderDirectiveSources
  shaderLocations: ShaderDirectiveLocations
  shaderDiagnostics: ShaderDirectiveDiagnostic[]
}

const shaderPresets = new Set<string>(SHADER_PRESETS)
const shaderInputs = new Set<string>(SHADER_INPUTS)
const postShaderPresets = new Set<string>(POST_SHADER_PRESETS)

function maskSourceRanges(source: string, ranges: Loc[]): string {
  if (ranges.length === 0) return source
  const out = source.split('')
  for (const range of ranges) {
    const start = Math.max(0, Math.min(out.length, range.start))
    const end = Math.max(start, Math.min(out.length, range.end))
    for (let i = start; i < end; i++) {
      const ch = out[i]
      if (ch !== '\n' && ch !== '\r') out[i] = ' '
    }
  }
  return out.join('')
}

function getTopLevelDirective(stmt: Stmt): { name: ShaderDirectiveName; right: Expr; loc: Loc } | null {
  if (stmt.type !== 'expr') return null
  const expr = stmt.expr
  if (expr.type !== 'assign') return null
  if (expr.left.type !== 'identifier') return null
  const name = expr.left.name
  if (
    name !== 'vertex'
    && name !== 'fragment'
    && name !== 'shader'
    && name !== 'shaderinput'
    && name !== 'postfragment'
    && name !== 'postshader'
  ) return null
  return { name, right: expr.right, loc: stmt.loc }
}

export function prepareShaderDirectives(source: string): PreparedShaderSource {
  const shaderSources: ShaderDirectiveSources = {
    vertex: null,
    fragment: null,
    shader: null,
    shaderinput: null,
    postfragment: null,
    postshader: null,
  }
  const shaderLocations: ShaderDirectiveLocations = {
    vertex: null,
    fragment: null,
    shader: null,
    shaderinput: null,
    postfragment: null,
    postshader: null,
  }
  const shaderDiagnostics: ShaderDirectiveDiagnostic[] = []
  const rangesToMask: Loc[] = []

  const lexed = tokenize(source)
  const parsed = parseTokens(source, lexed.tokens)
  if (parsed.program?.body?.length) {
    for (const stmt of parsed.program.body) {
      const directive = getTopLevelDirective(stmt)
      if (!directive) continue
      rangesToMask.push(directive.loc)
      if (directive.right.type !== 'string') {
        shaderDiagnostics.push({
          message: `${directive.name} must be a string literal`,
          loc: directive.loc,
        })
        continue
      }
      if (directive.name === 'shader' && !shaderPresets.has(directive.right.value)) {
        shaderDiagnostics.push({
          message: `shader must be one of: ${SHADER_PRESETS.join(', ')}`,
          loc: directive.loc,
        })
        continue
      }
      if (directive.name === 'shaderinput' && !shaderInputs.has(directive.right.value)) {
        shaderDiagnostics.push({
          message: `shaderinput must be one of: ${SHADER_INPUTS.join(', ')}`,
          loc: directive.loc,
        })
        continue
      }
      if (directive.name === 'postshader' && !postShaderPresets.has(directive.right.value)) {
        shaderDiagnostics.push({
          message: `postshader must be one of: ${POST_SHADER_PRESETS.join(', ')}`,
          loc: directive.loc,
        })
        continue
      }
      shaderSources[directive.name] = directive.right.value
      shaderLocations[directive.name] = directive.loc
    }
  }

  return {
    sanitizedSource: maskSourceRanges(source, rangesToMask),
    shaderSources,
    shaderLocations,
    shaderDiagnostics,
  }
}
