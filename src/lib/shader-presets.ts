export const SHADER_PRESETS = [
  'lissajous',
  'scope',
  'orbit',
  'ribbon',
  'plasma',
  'tunnel',
  'rotozoom',
  'cube',
  'monolith',
  'polyexplode',
] as const

export type ShaderPresetName = typeof SHADER_PRESETS[number]

export const SHADER_INPUTS = [
  'audio',
  'editor',
] as const

export type ShaderInputName = typeof SHADER_INPUTS[number]

export const POST_SHADER_PRESETS = [
  'none',
  'crt',
  'bloom',
  'displace',
  'duotone',
  'swirl',
  'trail',
  'warp',
  'kaleido',
] as const

export type PostShaderPresetName = typeof POST_SHADER_PRESETS[number]
