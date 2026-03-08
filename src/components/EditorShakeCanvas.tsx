import { useEffect, useRef } from 'preact/hooks'
import { ctx, currentProgramContext, editor as editorState, primaryColor } from '../state.ts'

const AUDIO_TEXTURE_WIDTH = 2048
const ANALYSER_FFT_SIZE = 4096

const SHAKE_VERTEX_SHADER = `#version 300 es
precision highp float;

const vec2 POSITIONS[6] = vec2[6](
  vec2(-1.0, -1.0),
  vec2( 1.0, -1.0),
  vec2(-1.0,  1.0),
  vec2(-1.0,  1.0),
  vec2( 1.0, -1.0),
  vec2( 1.0,  1.0)
);

out vec2 vUv;

void main() {
  vec2 p = POSITIONS[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`

const SHAKE_FRAGMENT_DISPLACE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_source;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  float t = fract(vUv.x + u_time * 0.12);
  vec2 a = texture(u_audio, vec2(t, 0.5)).rg;
  vec2 disp = vec2(a.y - a.x, a.x + a.y) * 0.015;
  vec3 c = texture(u_source, clamp(vUv + disp, vec2(0.0), vec2(1.0))).rgb;
  c = mix(c, c.bgr, 0.12 + 0.12 * sin(u_time + vUv.y * 20.0));
  c += u_primaryColor * 0.08 * length(disp) * 18.0;
  fragColor = vec4(c, .6);
}
`

const SHAKE_FRAGMENT_GLITCH_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_source;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

void main() {
  vec2 uv = vUv;
  // Use same displace formula as in displace shader
  float t = fract(uv.x + u_time * 0.12);
  vec2 a = texture(u_audio, vec2(t, 0.5)).rg;
  vec2 disp = vec2(a.y - a.x, a.x + a.y) * 0.015;

  float amp = clamp(length(a) * 1.7, 0.0, 1.0);
  float scan = sin((uv.y + u_time * 0.7) * 130.0);
  float jitter = sin(uv.y * 420.0 + u_time * 22.0) * (0.0015 + amp * 0.0025);
  vec2 glitch_disp = vec2(
    jitter + (a.x - a.y) * (0.012 + amp * 0.032),
    scan * (0.001 + amp * 0.008) + (a.x + a.y) * (0.004 + amp * 0.004)
  );
  // Combine both displace and glitch effects
  vec2 total_disp = disp + glitch_disp;

  vec2 uvR = clamp(uv + total_disp * 1.45, vec2(0.0), vec2(1.0));
  vec2 uvG = clamp(uv + total_disp * 0.8, vec2(0.0), vec2(1.0));
  vec2 uvB = clamp(uv - total_disp * 1.2, vec2(0.0), vec2(1.0));
  vec3 rgb = vec3(
    texture(u_source, uvR).r,
    texture(u_source, uvG).g,
    texture(u_source, uvB).b
  );

  vec3 ghost = texture(u_source, clamp(uv - total_disp * 2.4, vec2(0.0), vec2(1.0))).rgb;
  rgb = mix(rgb, ghost, 0.12 + amp * 0.18);
  fragColor = vec4(rgb, .7);
}
`

class StereoAudioTap {
  private processor: AudioNode | null = null
  private splitter: ChannelSplitterNode | null = null
  private leftAnalyser: AnalyserNode | null = null
  private rightAnalyser: AnalyserNode | null = null
  private leftData = new Float32Array(ANALYSER_FFT_SIZE)
  private rightData = new Float32Array(ANALYSER_FFT_SIZE)

  connect() {
    const dspCtx = ctx.value
    const processor = dspCtx?.dsp.state.processor ?? null
    if (processor === this.processor) return

    this.disconnect()
    if (!dspCtx || !processor) return

    const ac = dspCtx.dsp.state.audioContext
    const splitter = ac.createChannelSplitter(2)
    const left = ac.createAnalyser()
    const right = ac.createAnalyser()
    left.fftSize = ANALYSER_FFT_SIZE
    right.fftSize = ANALYSER_FFT_SIZE
    left.smoothingTimeConstant = 0
    right.smoothingTimeConstant = 0

    processor.connect(splitter)
    splitter.connect(left, 0)
    splitter.connect(right, 1)

    this.processor = processor
    this.splitter = splitter
    this.leftAnalyser = left
    this.rightAnalyser = right
  }

  disconnect() {
    if (this.splitter && this.leftAnalyser) {
      try {
        this.splitter.disconnect(this.leftAnalyser)
      }
      catch {}
    }
    if (this.splitter && this.rightAnalyser) {
      try {
        this.splitter.disconnect(this.rightAnalyser)
      }
      catch {}
    }
    if (this.processor && this.splitter) {
      try {
        this.processor.disconnect(this.splitter)
      }
      catch {}
    }
    this.leftAnalyser = null
    this.rightAnalyser = null
    this.splitter = null
    this.processor = null
  }

  fillAudio(target: Float32Array) {
    const left = this.leftAnalyser
    const right = this.rightAnalyser
    if (!left || !right) {
      target.fill(0)
      return
    }

    left.getFloatTimeDomainData(this.leftData)
    right.getFloatTimeDomainData(this.rightData)
    const start = ANALYSER_FFT_SIZE - AUDIO_TEXTURE_WIDTH
    for (let i = 0; i < AUDIO_TEXTURE_WIDTH; i++) {
      target[i * 2] = this.leftData[start + i] ?? 0
      target[i * 2 + 1] = this.rightData[start + i] ?? 0
    }
  }
}

class ShakeRenderer {
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private sourceLocation: WebGLUniformLocation | null = null
  private audioLocation: WebGLUniformLocation | null = null
  private timeLocation: WebGLUniformLocation | null = null
  private resolutionLocation: WebGLUniformLocation | null = null
  private primaryColorLocation: WebGLUniformLocation | null = null
  private sourceTexture: WebGLTexture | null = null
  private audioTexture: WebGLTexture | null = null
  private sourceWidth = 0
  private sourceHeight = 0
  private primary: [number, number, number] = [0.18, 0.95, 0.62]

  init(canvas: HTMLCanvasElement, mode: EditorShakeMode): boolean {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    })
    if (!gl) return false
    this.gl = gl
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.STENCIL_TEST)
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.BLEND)

    const fragment = mode === 'glitch' ? SHAKE_FRAGMENT_GLITCH_SHADER : SHAKE_FRAGMENT_DISPLACE_SHADER
    const linked = this.linkProgram(SHAKE_VERTEX_SHADER, fragment)
    if (!linked) return false
    this.program = linked
    this.sourceLocation = gl.getUniformLocation(linked, 'u_source')
    this.audioLocation = gl.getUniformLocation(linked, 'u_audio')
    this.timeLocation = gl.getUniformLocation(linked, 'u_time')
    this.resolutionLocation = gl.getUniformLocation(linked, 'u_resolution')
    this.primaryColorLocation = gl.getUniformLocation(linked, 'u_primaryColor')

    this.sourceTexture = gl.createTexture()
    this.audioTexture = gl.createTexture()
    if (!this.sourceTexture || !this.audioTexture) return false

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.audioTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, AUDIO_TEXTURE_WIDTH, 1, 0, gl.RG, gl.FLOAT, null)

    return true
  }

  dispose() {
    const gl = this.gl
    if (!gl) return
    if (this.program) gl.deleteProgram(this.program)
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture)
    if (this.audioTexture) gl.deleteTexture(this.audioTexture)
    this.program = null
    this.sourceTexture = null
    this.audioTexture = null
    this.gl = null
    this.sourceWidth = 0
    this.sourceHeight = 0
  }

  setPrimaryColor(hex: string) {
    this.primary = hexToRgb01(hex, this.primary)
  }

  draw(
    output: HTMLCanvasElement,
    source: HTMLCanvasElement,
    timeSeconds: number,
    audioData: Float32Array,
  ) {
    const gl = this.gl
    if (!gl || !this.program || !this.sourceTexture || !this.audioTexture) return

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const width = Math.max(1, Math.floor(output.clientWidth * dpr))
    const height = Math.max(1, Math.floor(output.clientHeight * dpr))
    if (output.width !== width || output.height !== height) {
      output.width = width
      output.height = height
    }

    gl.viewport(0, 0, width, height)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    if (this.sourceWidth !== source.width || this.sourceHeight !== source.height) {
      this.sourceWidth = source.width
      this.sourceHeight = source.height
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    }
    else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source)
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.audioTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, AUDIO_TEXTURE_WIDTH, 1, gl.RG, gl.FLOAT, audioData)

    gl.useProgram(this.program)
    if (this.sourceLocation) gl.uniform1i(this.sourceLocation, 0)
    if (this.audioLocation) gl.uniform1i(this.audioLocation, 1)
    if (this.timeLocation) gl.uniform1f(this.timeLocation, timeSeconds)
    if (this.resolutionLocation) gl.uniform2f(this.resolutionLocation, width, height)
    if (this.primaryColorLocation) {
      gl.uniform3f(this.primaryColorLocation, this.primary[0], this.primary[1], this.primary[2])
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  private linkProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const gl = this.gl
    if (!gl) return null
    const vertex = this.createShader(gl.VERTEX_SHADER, vertexSource)
    const fragment = this.createShader(gl.FRAGMENT_SHADER, fragmentSource)
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex)
      if (fragment) gl.deleteShader(fragment)
      return null
    }

    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program) || 'Failed to link shake shader program')
      gl.deleteProgram(program)
      return null
    }
    return program
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl
    if (!gl) return null
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader) || 'Failed to compile shake shader')
      gl.deleteShader(shader)
      return null
    }
    return shader
  }
}

function hexToRgb01(hex: string, fallback: [number, number, number]): [number, number, number] {
  const normalized = hex.trim().replace(/^#/, '')
  const six = normalized.length === 3
    ? normalized.split('').map(c => c + c).join('')
    : normalized.length === 6
    ? normalized
    : null
  if (!six || !/^[0-9a-fA-F]{6}$/.test(six)) return fallback
  const r = parseInt(six.slice(0, 2), 16) / 255
  const g = parseInt(six.slice(2, 4), 16) / 255
  const b = parseInt(six.slice(4, 6), 16) / 255
  return [r, g, b]
}

export type EditorShakeMode = 'shake' | 'glitch'

export const EditorShakeCanvas = ({ mode }: { mode: EditorShakeMode }) => {
  const ref = useRef<HTMLCanvasElement>(null)
  const tapRef = useRef(new StereoAudioTap())
  const rendererRef = useRef<ShakeRenderer | null>(null)
  const audioDataRef = useRef(new Float32Array(AUDIO_TEXTURE_WIDTH * 2))
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const renderer = new ShakeRenderer()
    if (!renderer.init(canvas, mode)) return
    rendererRef.current = renderer

    const frame = () => {
      const source = editorState.value?.canvas as HTMLCanvasElement | undefined
      const output = ref.current
      const r = rendererRef.current
      if (source && output && source.width > 0 && source.height > 0 && r) {
        r.setPrimaryColor(primaryColor.value)
        tapRef.current.connect()
        tapRef.current.fillAudio(audioDataRef.current)
        r.draw(
          output,
          source,
          currentProgramContext.value?.timeSeconds.value ?? 0,
          audioDataRef.current,
        )
      }
      rafIdRef.current = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
      tapRef.current.disconnect()
      renderer.dispose()
      rendererRef.current = null
    }
  }, [mode])

  return <canvas ref={ref} class="absolute inset-0 w-full h-full pointer-events-none" />
}
