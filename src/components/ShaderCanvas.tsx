import { useEffect, useRef } from 'preact/hooks'
import type { DspProgramContext } from '../dsp.ts'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import {
  POST_SHADER_PRESETS,
  type PostShaderPresetName,
  SHADER_INPUTS,
  SHADER_PRESETS,
  type ShaderInputName,
  type ShaderPresetName,
} from '../lib/shader-presets.ts'
import { settings } from '../settings.ts'
import { ctx, currentProgramContext, editor as editorState, primaryColor, theme } from '../state.ts'

const AUDIO_TEXTURE_WIDTH = 2048
const ANALYSER_FFT_SIZE = 4096
const TWO_PI = Math.PI * 2

const FULLSCREEN_PASS_VERTEX_SHADER = `#version 300 es
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

const FULLSCREEN_STRIP_VERTEX_SHADER = `#version 300 es
precision highp float;

const vec2 POSITIONS[4] = vec2[4](
  vec2(-1.0, -1.0),
  vec2( 1.0, -1.0),
  vec2(-1.0,  1.0),
  vec2( 1.0,  1.0)
);

out vec2 vUv;

void main() {
  vec2 p = POSITIONS[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`

const CUSTOM_FALLBACK_VERTEX_SHADER = FULLSCREEN_PASS_VERTEX_SHADER

const CUSTOM_FALLBACK_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));
  vec2 p = uv * 2.0 - 1.0;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  p.x *= aspect;

  float glow = 0.0;
  for (int i = 0; i < 64; i++) {
    float t = float(i) / 63.0;
    vec2 a = texture(u_audio, vec2(t, 0.5)).rg;
    a.x *= aspect;
    float d = length(p - a);
    glow += 0.011 / (0.002 + d * d * 24.0);
  }

  float pulse = 0.72 + 0.28 * sin(u_time * 2.5);
  vec3 bg = vec3(0.01, 0.01, 0.015);
  vec3 curve = u_primaryColor * glow * pulse;
  fragColor = vec4(bg + curve, 1.0);
}
`

const DEFAULT_POST_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_scene;
uniform sampler2D u_feedback;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  vec3 c = texture(u_scene, vUv).rgb;
  fragColor = vec4(c, 1.0);
}
`

const POST_SHADER_FRAGMENTS: Record<PostShaderPresetName, string> = {
  none: DEFAULT_POST_FRAGMENT_SHADER,
  crt: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_scene;
uniform sampler2D u_feedback;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  vec2 uv = vUv;
  vec2 px = 1.0 / max(u_resolution, vec2(1.0));
  float wave = sin(uv.y * 320.0 + u_time * 5.0) * 0.0015;
  uv.x += wave;
  vec3 c;
  c.r = texture(u_scene, uv + vec2(px.x * 1.2, 0.0)).r;
  c.g = texture(u_scene, uv).g;
  c.b = texture(u_scene, uv - vec2(px.x * 1.2, 0.0)).b;
  float scan = 0.92 + 0.08 * sin((uv.y + u_time * 0.04) * u_resolution.y * 1.2);
  float vignette = smoothstep(1.25, 0.2, length((vUv - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0)));
  c *= scan * vignette;
  c += u_primaryColor * 0.06;
  fragColor = vec4(c, 1.0);
}
`,
  bloom: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_scene;
uniform sampler2D u_feedback;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  vec2 px = 1.0 / max(u_resolution, vec2(1.0));
  vec3 base = texture(u_scene, vUv).rgb;
  vec3 blur = texture(u_scene, vUv + vec2(px.x * 2.0, 0.0)).rgb * 0.16
    + texture(u_scene, vUv - vec2(px.x * 2.0, 0.0)).rgb * 0.16
    + texture(u_scene, vUv + vec2(0.0, px.y * 2.0)).rgb * 0.16
    + texture(u_scene, vUv - vec2(0.0, px.y * 2.0)).rgb * 0.16
    + texture(u_scene, vUv).rgb * 0.36;
  float glow = dot(blur, vec3(0.333));
  vec3 c = base * 0.72 + blur * 0.55 + u_primaryColor * glow * 0.18;
  fragColor = vec4(c, 1.0);
}
`,
  displace: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_scene;
uniform sampler2D u_feedback;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  float t = fract(vUv.x + u_time * 0.12);
  vec2 a = texture(u_audio, vec2(t, 0.5)).rg;
  vec2 disp = vec2(a.y - a.x, a.x + a.y) * 0.015;
  vec3 c = texture(u_scene, vUv + disp).rgb;
  c = mix(c, c.bgr, 0.12 + 0.12 * sin(u_time + vUv.y * 20.0));
  c += u_primaryColor * 0.08 * length(disp) * 18.0;
  fragColor = vec4(c, 1.0);
}
`,
  duotone: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_scene;
uniform sampler2D u_feedback;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  vec3 c = texture(u_scene, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 dark = vec3(0.03, 0.04, 0.07);
  vec3 hi = normalize(max(u_primaryColor, vec3(0.001)));
  vec3 duo = mix(dark, hi, smoothstep(0.04, 0.9, l));
  float grain = fract(sin(dot(vUv * u_resolution + u_time, vec2(12.9898, 78.233))) * 43758.5453);
  duo += (grain - 0.5) * 0.02;
  fragColor = vec4(duo, 1.0);
}
`,
  swirl: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_scene;
uniform sampler2D u_feedback;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  vec2 px = 1.0 / max(u_resolution, vec2(1.0));
  vec3 scene = texture(u_scene, vUv).rgb;
  vec2 a = texture(u_audio, vec2(fract(vUv.x * 0.6 + u_time * 0.09), 0.5)).rg;
  float amp = clamp(length(a) * 1.8, 0.0, 1.0);

  vec2 swirl = vec2(
    sin(vUv.y * 18.0 + u_time * 1.6),
    cos(vUv.x * 16.0 - u_time * 1.3)
  ) * (0.0018 + amp * 0.018);
  vec2 drift = vec2(-0.0008, 0.0012) + (a - 0.5 * (a.x + a.y)) * 0.028;
  vec2 uv = clamp(vUv + drift + swirl, vec2(0.0), vec2(1.0));

  vec3 prev0 = texture(u_feedback, uv).rgb;
  vec3 prev1 = texture(u_feedback, clamp(uv + vec2(px.x * 2.0, 0.0), vec2(0.0), vec2(1.0))).rgb;
  vec3 prev2 = texture(u_feedback, clamp(uv - vec2(0.0, px.y * 2.0), vec2(0.0), vec2(1.0))).rgb;
  vec3 trail = (prev0 * 0.62 + prev1 * 0.24 + prev2 * 0.14);
  trail = vec3(trail.r * 1.04, trail.g * 1.01, trail.b * 1.08);

  float gate = 0.06 + amp * 0.26;
  vec3 neon = mix(vec3(0.03, 0.05, 0.09), normalize(max(u_primaryColor, vec3(0.001))), 0.78);
  vec3 c = mix(trail * (0.982 + amp * 0.01), scene + neon * amp * 0.24, gate);

  // add a subtle phosphor bloom from feedback luminance
  float l = dot(trail, vec3(0.2126, 0.7152, 0.0722));
  c += neon * l * (0.08 + amp * 0.15);
  fragColor = vec4(c, 1.0);
}
`,
  trail: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_scene;
uniform sampler2D u_feedback;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  vec2 px = 1.0 / max(u_resolution, vec2(1.0));
  vec3 scene = texture(u_scene, vUv).rgb;
  vec2 a = texture(u_audio, vec2(fract(vUv.x * 0.8 + u_time * 0.05), 0.5)).rg;
  float amp = clamp((abs(a.x) + abs(a.y)) * 2.0, 0.0, 1.0);

  vec2 drift = vec2(-0.0028, 0.0014) + (a - 0.5 * (a.x + a.y)) * 0.05;
  vec2 uv = clamp(vUv + drift, vec2(0.0), vec2(1.0));

  vec3 p0 = texture(u_feedback, uv).rgb;
  vec3 p1 = texture(u_feedback, clamp(uv + vec2(px.x * 12.0, 0.0), vec2(0.0), vec2(1.0))).rgb;
  vec3 p2 = texture(u_feedback, clamp(uv - vec2(px.x * 8.0, px.y * 6.0), vec2(0.0), vec2(1.0))).rgb;
  vec3 p3 = texture(u_feedback, clamp(uv + vec2(0.0, px.y * 11.0), vec2(0.0), vec2(1.0))).rgb;
  vec3 p4 = texture(u_feedback, clamp(uv + vec2(px.x * 7.0, -px.y * 12.0), vec2(0.0), vec2(1.0))).rgb;
  vec3 p5 = texture(u_feedback, clamp(uv - vec2(px.x * 14.0, 0.0), vec2(0.0), vec2(1.0))).rgb;
  vec3 trail = p0 * 0.38 + p1 * 0.2 + p2 * 0.16 + p3 * 0.11 + p4 * 0.09 + p5 * 0.06;

  vec3 tint = normalize(max(u_primaryColor, vec3(0.001)));
  trail = mix(trail, trail * tint.bgr, 0.45 + amp * 0.28);
  vec3 ghost = max(trail - scene * 0.22, vec3(0.0));
  vec3 c = scene * 0.42 + trail * (0.62 + amp * 0.22) + ghost * (0.45 + amp * 0.3);
  c += tint * dot(ghost, vec3(0.333)) * (0.22 + amp * 0.22);
  c = mix(c, c.rbg, 0.05 + amp * 0.14);
  fragColor = vec4(c, 1.0);
}
`,
  warp: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_scene;
uniform sampler2D u_feedback;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  vec3 scene = texture(u_scene, vUv).rgb;
  vec2 a = texture(u_audio, vec2(fract(vUv.y * 0.7 + u_time * 0.11), 0.5)).rg;
  float amp = clamp(length(a) * 2.25, 0.0, 1.0);

  vec2 p = vUv * 2.0 - 1.0;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);
  float r = length(p);
  float ang = atan(p.y, p.x);
  ang += 0.08 * sin(r * 16.0 - u_time * 1.9) + amp * 0.2;
  r *= 1.0 + 0.11 * sin(u_time * 1.2 + r * 22.0) + amp * 0.19;
  vec2 uv = vec2(cos(ang), sin(ang)) * r;
  uv.x /= u_resolution.x / max(u_resolution.y, 1.0);
  uv = clamp(uv * 0.5 + 0.5 + (a - 0.5 * (a.x + a.y)) * 0.032, vec2(0.0), vec2(1.0));

  vec3 prev = texture(u_feedback, uv).rgb;
  vec3 prev2 = texture(u_feedback, clamp(mix(vUv, uv, 0.78), vec2(0.0), vec2(1.0))).rgb;
  vec3 prev3 = texture(u_feedback, clamp(uv + vec2(0.004, -0.003), vec2(0.0), vec2(1.0))).rgb;
  vec3 trail = prev * 0.58 + prev2 * 0.27 + prev3 * 0.15;
  vec3 tint = normalize(max(u_primaryColor, vec3(0.001)));
  vec3 c = mix(trail * (0.992 + amp * 0.004), scene + tint * 0.28 * amp, 0.07 + amp * 0.13);
  c = mix(c, c.gbr, 0.2 + 0.28 * sin(u_time * 1.1 + vUv.x * 13.0));
  fragColor = vec4(c, 1.0);
}
`,
  kaleido: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_scene;
uniform sampler2D u_feedback;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

vec2 kaleido(vec2 uv, float n) {
  vec2 p = uv * 2.0 - 1.0;
  float a = atan(p.y, p.x);
  float r = length(p);
  float seg = 6.28318530718 / n;
  a = mod(a, seg);
  a = abs(a - seg * 0.5);
  vec2 q = vec2(cos(a), sin(a)) * r;
  return q * 0.5 + 0.5;
}

void main() {
  vec3 scene = texture(u_scene, vUv).rgb;
  vec2 a = texture(u_audio, vec2(fract(vUv.x * 0.5 + u_time * 0.06), 0.5)).rg;
  float amp = clamp(length(a) * 1.55, 0.0, 1.0);
  float sides = 5.0 + floor(amp * 6.0);
  vec2 k = kaleido(vUv + (a - 0.5 * (a.x + a.y)) * 0.02, sides);

  vec3 prev = texture(u_feedback, k).rgb;
  vec3 prev2 = texture(u_feedback, kaleido(k + vec2(0.005, -0.003), sides + 1.0)).rgb;
  vec3 prev3 = texture(u_feedback, kaleido(k + vec2(-0.006, 0.004), sides + 2.0)).rgb;
  vec3 trail = prev * 0.56 + prev2 * 0.27 + prev3 * 0.17;
  vec3 tint = normalize(max(u_primaryColor, vec3(0.001)));
  vec3 c = mix(trail * (0.992 + amp * 0.004), scene, 0.17 + amp * 0.16);
  c += tint * dot(trail, vec3(0.333)) * (0.08 + amp * 0.12);
  c = mix(c, c.bgr, 0.08 + amp * 0.1);
  fragColor = vec4(c, 1.0);
}
`,
}

const PRESET_3D_FRAGMENTS: Partial<Record<ShaderPresetName, string>> = {
  cube: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

mat3 rotX(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat3(
    1.0, 0.0, 0.0,
    0.0, c, -s,
    0.0, s, c
  );
}

mat3 rotY(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat3(
    c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c
  );
}

bool hitBox(vec3 ro, vec3 rd, vec3 b, out float t, out vec3 n) {
  vec3 inv = 1.0 / rd;
  vec3 t0 = (-b - ro) * inv;
  vec3 t1 = ( b - ro) * inv;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  float tn = max(max(tmin.x, tmin.y), tmin.z);
  float tf = min(min(tmax.x, tmax.y), tmax.z);
  if (tf < max(tn, 0.0)) return false;
  t = max(tn, 0.0);
  vec3 p = ro + rd * t;
  vec3 d = abs(p) - b;
  if (d.x > d.y && d.x > d.z) n = vec3(sign(p.x), 0.0, 0.0);
  else if (d.y > d.z) n = vec3(0.0, sign(p.y), 0.0);
  else n = vec3(0.0, 0.0, sign(p.z));
  return true;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / max(u_resolution.y, 1.0);
  vec2 a0 = texture(u_audio, vec2(0.05, 0.5)).rg;
  vec2 a1 = texture(u_audio, vec2(0.22, 0.5)).rg;
  float bass = clamp((abs(a0.x) + abs(a0.y)) * 0.95, 0.0, 1.0);
  float mid = clamp((abs(a1.x) + abs(a1.y)) * 0.9, 0.0, 1.0);

  vec3 ro = vec3(0.0, 0.0, 3.2 - bass * 0.45);
  vec3 rd = normalize(vec3(uv, -2.2));
  mat3 r = rotY(u_time * 0.72 + mid * 1.8) * rotX(0.52 + bass * 0.28);
  ro = r * ro;
  rd = r * rd;

  float t;
  vec3 n;
  vec3 tint = normalize(max(u_primaryColor, vec3(0.001)));
  if (hitBox(ro, rd, vec3(0.92), t, n)) {
    vec3 p = ro + rd * t;
    vec3 light = normalize(vec3(0.45, 0.75, 0.55));
    float diff = max(dot(n, light), 0.0);
    float rim = pow(1.0 - max(dot(-rd, n), 0.0), 2.4);
    vec3 side = 0.16 + abs(n) * vec3(0.28, 0.22, 0.18);
    side *= 0.7 + 0.3 * (0.5 + 0.5 * sin((p.x + p.y + p.z) * 8.0 + u_time * 2.6));
    vec3 color = side * (0.16 + 0.84 * diff);
    color += tint * (0.17 + diff * 0.58 + rim * 0.22) * (0.55 + bass * 0.95);
    fragColor = vec4(color, 1.0);
    return;
  }

  float vign = smoothstep(1.35, 0.12, length(uv));
  vec3 bg = vec3(0.008, 0.01, 0.015) + tint * 0.03;
  fragColor = vec4(bg * vign, 1.0);
}
`,
  monolith: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

mat3 rotY(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat3(
    c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c
  );
}

bool hitBoxLocal(vec3 ro, vec3 rd, vec3 b, out float t, out vec3 n) {
  vec3 inv = 1.0 / rd;
  vec3 t0 = (-b - ro) * inv;
  vec3 t1 = ( b - ro) * inv;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  float tn = max(max(tmin.x, tmin.y), tmin.z);
  float tf = min(min(tmax.x, tmax.y), tmax.z);
  if (tf < max(tn, 0.0)) return false;
  t = max(tn, 0.0);
  vec3 p = ro + rd * t;
  vec3 d = abs(p) - b;
  if (d.x > d.y && d.x > d.z) n = vec3(sign(p.x), 0.0, 0.0);
  else if (d.y > d.z) n = vec3(0.0, sign(p.y), 0.0);
  else n = vec3(0.0, 0.0, sign(p.z));
  return true;
}

bool hitBoxAt(vec3 ro, vec3 rd, vec3 center, vec3 b, out float t, out vec3 n) {
  return hitBoxLocal(ro - center, rd, b, t, n);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / max(u_resolution.y, 1.0);
  vec2 low = texture(u_audio, vec2(0.04, 0.5)).rg;
  vec2 high = texture(u_audio, vec2(0.72, 0.5)).rg;
  float bass = clamp((abs(low.x) + abs(low.y)) * 0.95, 0.0, 1.0);
  float treble = clamp((abs(high.x) + abs(high.y)) * 1.1, 0.0, 1.0);

  vec3 ro = vec3(0.0, 0.06, 4.0 - bass * 0.62);
  vec3 rd = normalize(vec3(uv * vec2(1.0, 1.08), -2.35));
  mat3 r = rotY(u_time * 0.3 + treble * 0.35);
  ro = r * ro;
  rd = r * rd;

  float tMin = 1e9;
  vec3 n = vec3(0.0);
  vec3 base = vec3(0.18, 0.2, 0.23);
  float t;
  vec3 tn;

  if (hitBoxAt(ro, rd, vec3(0.0, -0.1, 0.0), vec3(0.38, 1.25 + bass * 0.22, 0.38), t, tn) && t < tMin) {
    tMin = t;
    n = tn;
    base = vec3(0.24, 0.21, 0.19);
  }

  vec3 orb = vec3(cos(u_time * 0.72) * 0.98, 0.3 + bass * 0.25, sin(u_time * 0.72) * 0.98);
  if (hitBoxAt(ro, rd, orb, vec3(0.2, 0.72, 0.2), t, tn) && t < tMin) {
    tMin = t;
    n = tn;
    base = vec3(0.18, 0.25, 0.2);
  }

  if (hitBoxAt(ro, rd, vec3(0.0, -1.16, 0.0), vec3(1.5, 0.16, 1.5), t, tn) && t < tMin) {
    tMin = t;
    n = tn;
    base = vec3(0.12, 0.13, 0.15);
  }

  vec3 tint = normalize(max(u_primaryColor, vec3(0.001)));
  if (tMin < 1e8) {
    vec3 p = ro + rd * tMin;
    vec3 light = normalize(vec3(-0.45, 0.8, 0.28));
    float diff = max(dot(n, light), 0.0);
    float rim = pow(1.0 - max(dot(-rd, n), 0.0), 2.0);
    float band = 0.78 + 0.22 * step(0.0, sin((p.y + p.x * 0.6 + p.z * 0.4) * 18.0));
    vec3 color = base * band * (0.2 + 0.8 * diff);
    color += tint * (0.2 + diff * 0.46 + rim * 0.25) * (0.55 + bass * 1.05);
    fragColor = vec4(color, 1.0);
    return;
  }

  float vign = smoothstep(1.4, 0.14, length(uv));
  vec3 bg = vec3(0.008, 0.01, 0.015) + tint * 0.028;
  fragColor = vec4(bg * vign, 1.0);
}
`,
  polyexplode: `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_audio;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
out vec4 fragColor;

const float PI = 3.14159265359;

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

float hash1(float x) {
  return fract(sin(x * 113.73) * 43758.5453123);
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdNgon(vec2 p, float n, float r) {
  float a = atan(p.y, p.x) + PI;
  float seg = 2.0 * PI / n;
  return cos(floor(0.5 + a / seg) * seg - a) * length(p) - r;
}

float sdPrism(vec3 p, float n, float r, float h) {
  float d = sdNgon(p.xy, n, r);
  float dz = abs(p.z) - h;
  return max(d, dz);
}

float mapScene(vec3 p, float sides, float explode, float twitch) {
  vec3 q = p;
  q.xy *= rot(u_time * 0.55 + twitch * 1.5);
  q.yz *= rot(0.75 + sin(u_time * 0.9) * 0.22 + twitch * 0.35);
  q.xz *= rot(0.42 + cos(u_time * 0.63) * 0.18);

  float radius = 0.48 + (1.0 - explode) * 0.2 + twitch * 0.08;
  float halfH = 0.28 + twitch * 0.12;
  float core = sdPrism(q, sides, radius, halfH);

  // Audio-driven segmented outward blast.
  float a = atan(q.y, q.x);
  float seg = 2.0 * PI / sides;
  float idx = floor((a + PI) / seg);
  float rnd = hash1(idx + floor(u_time * 2.5) * 17.0);
  vec3 dir = normalize(vec3(cos(idx * seg), sin(idx * seg), rnd * 0.9 - 0.45));
  float blast = explode * (0.7 + rnd * 1.7);
  vec3 shardCenter = dir * (0.34 + blast);
  float shard = sdBox(q - shardCenter, vec3(0.045 + rnd * 0.065, 0.04 + rnd * 0.03, 0.08 + rnd * 0.05));

  return min(core, shard);
}

vec3 calcNormal(vec3 p, float sides, float explode, float twitch) {
  vec2 e = vec2(0.0016, 0.0);
  float dx = mapScene(p + vec3(e.x, e.y, e.y), sides, explode, twitch) - mapScene(p - vec3(e.x, e.y, e.y), sides, explode, twitch);
  float dy = mapScene(p + vec3(e.y, e.x, e.y), sides, explode, twitch) - mapScene(p - vec3(e.y, e.x, e.y), sides, explode, twitch);
  float dz = mapScene(p + vec3(e.y, e.y, e.x), sides, explode, twitch) - mapScene(p - vec3(e.y, e.y, e.x), sides, explode, twitch);
  return normalize(vec3(dx, dy, dz));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / max(u_resolution.y, 1.0);
  vec2 a0 = texture(u_audio, vec2(0.03, 0.5)).rg;
  vec2 a1 = texture(u_audio, vec2(0.17, 0.5)).rg;
  vec2 a2 = texture(u_audio, vec2(fract(vUv.x * 0.7 + 0.53), 0.5)).rg;

  float bass = clamp((abs(a0.x) + abs(a0.y)) * 1.35, 0.0, 1.0);
  float mid = clamp((abs(a1.x) + abs(a1.y)) * 1.25, 0.0, 1.0);
  float stereo = clamp(abs(a2.x - a2.y) * 2.1, 0.0, 1.0);

  float pulse = 0.5 + 0.5 * sin(u_time * 24.0 + mid * 7.0 + stereo * 12.0);
  float explode = pow(clamp(bass * 0.9 + pulse * 0.7, 0.0, 1.0), 1.35);
  float twitch = clamp(mid * 0.65 + stereo * 0.7, 0.0, 1.0);
  float sides = 7.0 + floor(clamp(twitch * 10.0 + bass * 3.0, 0.0, 12.0));

  vec3 ro = vec3(0.0, 0.0, 3.5 - explode * 0.95);
  vec3 rd = normalize(vec3(uv * vec2(1.0, 1.05), -2.3));
  ro.xy *= rot(u_time * 0.18 + stereo * 0.25);
  rd.xy *= rot(u_time * 0.18 + stereo * 0.25);

  float t = 0.0;
  float d = 0.0;
  bool hit = false;
  for (int i = 0; i < 72; i++) {
    vec3 p = ro + rd * t;
    d = mapScene(p, sides, explode, twitch);
    if (d < 0.0012) {
      hit = true;
      break;
    }
    t += d * 0.78;
    if (t > 16.0) break;
  }

  vec3 tint = normalize(max(u_primaryColor, vec3(0.001)));
  vec3 bg = vec3(0.006, 0.008, 0.012);
  float ring = abs(sin(length(uv) * (24.0 + explode * 42.0) - u_time * (5.0 + bass * 7.0)));
  bg += tint * ring * (0.02 + explode * 0.18);
  bg *= smoothstep(1.45, 0.08, length(uv));

  if (!hit) {
    fragColor = vec4(bg, 1.0);
    return;
  }

  vec3 p = ro + rd * t;
  vec3 n = calcNormal(p, sides, explode, twitch);
  vec3 l0 = normalize(vec3(0.55, 0.75, 0.4));
  vec3 l1 = normalize(vec3(-0.5, 0.3, 0.85));
  float diff0 = max(dot(n, l0), 0.0);
  float diff1 = max(dot(n, l1), 0.0);
  float rim = pow(1.0 - max(dot(-rd, n), 0.0), 2.2);
  float crack = step(0.65, fract((atan(p.y, p.x) + PI) / (2.0 * PI) * sides * 3.0 + explode * 8.0));

  vec3 metal = mix(vec3(0.18, 0.16, 0.2), vec3(0.34, 0.28, 0.22), crack);
  vec3 c = metal * (0.1 + 0.85 * diff0 + 0.35 * diff1);
  c += tint * (0.28 + 0.95 * explode) * (0.22 + diff0 * 0.62 + rim * 0.7);
  c = mix(c, c.gbr, 0.06 + stereo * 0.2);
  c += bg * (0.25 + rim * 0.35);
  fragColor = vec4(c, 1.0);
}
`,
}

const BLIT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D u_source;
out vec4 fragColor;

void main() {
  fragColor = texture(u_source, vUv);
}
`

const FAST_LINE_VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
uniform float u_aspect;

void main() {
  gl_Position = vec4(a_position.x * u_aspect, a_position.y, 0.0, 1.0);
}
`

const FAST_LINE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform float u_intensity;
uniform vec3 u_primaryColor;
out vec4 fragColor;

void main() {
  vec3 color = u_primaryColor * u_intensity;
  fragColor = vec4(color, 1.0);
}
`

type ShaderStage = 'vertex' | 'fragment' | 'postfragment'

type RuntimeShaderError = {
  stage: ShaderStage
  message: string
}

type CustomProgram = {
  program: WebGLProgram
  audioLocation: WebGLUniformLocation | null
  timeLocation: WebGLUniformLocation | null
  resolutionLocation: WebGLUniformLocation | null
  primaryColorLocation: WebGLUniformLocation | null
}

type FastLineProgram = {
  program: WebGLProgram
  aspectLocation: WebGLUniformLocation | null
  intensityLocation: WebGLUniformLocation | null
  primaryColorLocation: WebGLUniformLocation | null
}

type PostProgram = {
  program: WebGLProgram
  sceneLocation: WebGLUniformLocation | null
  feedbackLocation: WebGLUniformLocation | null
  audioLocation: WebGLUniformLocation | null
  timeLocation: WebGLUniformLocation | null
  resolutionLocation: WebGLUniformLocation | null
  primaryColorLocation: WebGLUniformLocation | null
}

type BlitProgram = {
  program: WebGLProgram
  sourceLocation: WebGLUniformLocation | null
}

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

class ShaderRenderer {
  private gl: WebGL2RenderingContext | null = null
  private mode: 'default' | 'custom' = 'default'
  private activeShaderKey = ''
  private preset: ShaderPresetName = 'lissajous'
  private shaderInput: ShaderInputName = 'audio'
  private activePostShaderKey = ''
  private presetData = new Float32Array(AUDIO_TEXTURE_WIDTH * 2)
  private primaryColor: [number, number, number] = [0.18, 0.95, 0.62]

  private lineProgram: FastLineProgram | null = null
  private lineBuffer: WebGLBuffer | null = null

  private texture: WebGLTexture | null = null
  private editorTexture: WebGLTexture | null = null
  private editorWidth = 0
  private editorHeight = 0
  private sceneTexture: WebGLTexture | null = null
  private sceneFramebuffer: WebGLFramebuffer | null = null
  private feedbackTextures: [WebGLTexture | null, WebGLTexture | null] = [null, null]
  private feedbackFramebuffers: [WebGLFramebuffer | null, WebGLFramebuffer | null] = [null, null]
  private feedbackReadIndex = 0
  private sceneWidth = 0
  private sceneHeight = 0
  private feedbackWidth = 0
  private feedbackHeight = 0
  private feedbackNeedsClear = true
  private customProgram: CustomProgram | null = null
  private presetPrograms: Partial<Record<ShaderPresetName, CustomProgram>> = {}
  private postProgram: PostProgram | null = null
  private blitProgram: BlitProgram | null = null

  init(canvas: HTMLCanvasElement): boolean {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
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

    const lineProgram = this.createFastLineProgram()
    if ('error' in lineProgram) return false
    this.lineProgram = lineProgram
    const lineBuffer = gl.createBuffer()
    if (!lineBuffer) return false
    this.lineBuffer = lineBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, AUDIO_TEXTURE_WIDTH * 2 * 4, gl.DYNAMIC_DRAW)

    const texture = gl.createTexture()
    if (!texture) return false
    this.texture = texture
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, AUDIO_TEXTURE_WIDTH, 1, 0, gl.RG, gl.FLOAT, null)

    const editorTexture = gl.createTexture()
    if (!editorTexture) return false
    this.editorTexture = editorTexture
    gl.bindTexture(gl.TEXTURE_2D, editorTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const sceneTexture = gl.createTexture()
    if (!sceneTexture) return false
    this.sceneTexture = sceneTexture
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const sceneFramebuffer = gl.createFramebuffer()
    if (!sceneFramebuffer) return false
    this.sceneFramebuffer = sceneFramebuffer

    for (let i = 0; i < 2; i++) {
      const fbTex = gl.createTexture()
      const fb = gl.createFramebuffer()
      if (!fbTex || !fb) return false
      this.feedbackTextures[i] = fbTex
      this.feedbackFramebuffers[i] = fb
      gl.bindTexture(gl.TEXTURE_2D, fbTex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    }

    const postProgram = this.createPostProgram(DEFAULT_POST_FRAGMENT_SHADER)
    if ('error' in postProgram) return false
    this.postProgram = postProgram
    this.activePostShaderKey = DEFAULT_POST_FRAGMENT_SHADER

    const blitProgram = this.createBlitProgram()
    if ('error' in blitProgram) return false
    this.blitProgram = blitProgram

    return true
  }

  dispose() {
    const gl = this.gl
    if (!gl) return
    if (this.customProgram) gl.deleteProgram(this.customProgram.program)
    for (const program of Object.values(this.presetPrograms)) {
      if (program) gl.deleteProgram(program.program)
    }
    if (this.postProgram) gl.deleteProgram(this.postProgram.program)
    if (this.blitProgram) gl.deleteProgram(this.blitProgram.program)
    if (this.lineProgram) gl.deleteProgram(this.lineProgram.program)
    if (this.texture) gl.deleteTexture(this.texture)
    if (this.editorTexture) gl.deleteTexture(this.editorTexture)
    if (this.sceneTexture) gl.deleteTexture(this.sceneTexture)
    if (this.sceneFramebuffer) gl.deleteFramebuffer(this.sceneFramebuffer)
    for (const tex of this.feedbackTextures) {
      if (tex) gl.deleteTexture(tex)
    }
    for (const fb of this.feedbackFramebuffers) {
      if (fb) gl.deleteFramebuffer(fb)
    }
    if (this.lineBuffer) gl.deleteBuffer(this.lineBuffer)
    this.customProgram = null
    this.presetPrograms = {}
    this.postProgram = null
    this.blitProgram = null
    this.lineProgram = null
    this.texture = null
    this.editorTexture = null
    this.editorWidth = 0
    this.editorHeight = 0
    this.sceneTexture = null
    this.sceneFramebuffer = null
    this.feedbackTextures = [null, null]
    this.feedbackFramebuffers = [null, null]
    this.feedbackReadIndex = 0
    this.lineBuffer = null
    this.sceneWidth = 0
    this.sceneHeight = 0
    this.feedbackWidth = 0
    this.feedbackHeight = 0
    this.feedbackNeedsClear = true
    this.gl = null
    this.mode = 'default'
    this.activeShaderKey = ''
    this.shaderInput = 'audio'
    this.activePostShaderKey = ''
  }

  setShaders(
    vertexSource: string | null,
    fragmentSource: string | null,
    preset: string | null,
    shaderInput: string | null,
    postFragmentSource: string | null,
    postPreset: string | null,
  ): RuntimeShaderError | null {
    const hasVertex = !!vertexSource?.trim()
    const hasFragment = !!fragmentSource?.trim()
    const hasPostFragment = !!postFragmentSource?.trim()
    const nextPreset: ShaderPresetName = SHADER_PRESETS.includes((preset ?? '') as ShaderPresetName)
      ? (preset as ShaderPresetName)
      : 'lissajous'
    const nextShaderInput: ShaderInputName = SHADER_INPUTS.includes((shaderInput ?? '') as ShaderInputName)
      ? (shaderInput as ShaderInputName)
      : 'audio'
    const nextPostPreset: PostShaderPresetName =
      POST_SHADER_PRESETS.includes((postPreset ?? '') as PostShaderPresetName)
        ? (postPreset as PostShaderPresetName)
        : 'none'

    if (nextShaderInput !== this.shaderInput) {
      this.shaderInput = nextShaderInput
      this.feedbackNeedsClear = true
    }

    const postFragment = hasPostFragment ? postFragmentSource! : POST_SHADER_FRAGMENTS[nextPostPreset]
    if (!postFragment) {
      return {
        stage: 'postfragment',
        message: 'Missing post-processing fragment source',
      }
    }

    if (this.activePostShaderKey !== postFragment || !this.postProgram) {
      const nextPostProgram = this.createPostProgram(postFragment)
      if ('error' in nextPostProgram) return nextPostProgram.error
      if (this.gl && this.postProgram) this.gl.deleteProgram(this.postProgram.program)
      this.postProgram = nextPostProgram
      this.activePostShaderKey = postFragment
      this.feedbackNeedsClear = true
    }
    if (!hasVertex && !hasFragment) {
      this.mode = 'default'
      this.activeShaderKey = ''
      if (this.preset !== nextPreset) this.feedbackNeedsClear = true
      this.preset = nextPreset
      return null
    }

    const vertex = hasVertex ? vertexSource! : CUSTOM_FALLBACK_VERTEX_SHADER
    const fragment = hasFragment ? fragmentSource! : CUSTOM_FALLBACK_FRAGMENT_SHADER
    const key = `${vertex}:::${fragment}`
    if (this.mode === 'custom' && key === this.activeShaderKey) return null

    const next = this.createCustomProgram(vertex, fragment)
    if ('error' in next) return next.error

    if (this.gl && this.customProgram) this.gl.deleteProgram(this.customProgram.program)
    this.customProgram = next
    this.mode = 'custom'
    this.activeShaderKey = key
    return null
  }

  setPrimaryColor(hex: string) {
    this.primaryColor = hexToRgb01(hex, this.primaryColor)
  }

  draw(canvas: HTMLCanvasElement, timeSeconds: number, audioData: Float32Array) {
    const gl = this.gl
    if (!gl) return

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    this.uploadAudioTexture(audioData)
    let sourceTexture: WebGLTexture | null = null
    if (this.shaderInput === 'editor') {
      sourceTexture = this.uploadEditorTexture()
    }
    if (!sourceTexture) {
      if (!this.ensureSceneTarget(width, height)) return
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer)
      gl.viewport(0, 0, width, height)
      gl.clearColor(0.01, 0.01, 0.015, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)

      if (this.mode === 'custom' && this.customProgram) {
        this.drawCustom(timeSeconds, width, height)
      }
      else if (PRESET_3D_FRAGMENTS[this.preset]) {
        this.drawPreset3D(this.preset, timeSeconds, width, height, audioData)
      }
      else {
        this.drawFastDefault(timeSeconds, width, height, audioData)
      }
      sourceTexture = this.sceneTexture
    }

    if (!this.ensureFeedbackTargets(width, height)) return

    const readIndex = this.feedbackReadIndex
    const writeIndex = (readIndex + 1) & 1
    const readTexture = this.feedbackTextures[readIndex]
    const writeTexture = this.feedbackTextures[writeIndex]
    const writeFramebuffer = this.feedbackFramebuffers[writeIndex]
    if (!readTexture || !writeTexture || !writeFramebuffer || !sourceTexture) return

    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFramebuffer)
    gl.viewport(0, 0, width, height)
    this.drawPost(timeSeconds, width, height, sourceTexture, readTexture)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, width, height)
    this.drawBlit(writeTexture)
    this.feedbackReadIndex = writeIndex
  }

  private uploadAudioTexture(audioData: Float32Array) {
    const gl = this.gl
    const texture = this.texture
    if (!gl || !texture) return
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, AUDIO_TEXTURE_WIDTH, 1, gl.RG, gl.FLOAT, audioData)
  }

  private uploadEditorTexture(): WebGLTexture | null {
    const gl = this.gl
    const texture = this.editorTexture
    const editorCanvas = editorState.value?.canvas as HTMLCanvasElement | undefined
    if (!gl || !texture || !editorCanvas) return null
    if (editorCanvas.width < 1 || editorCanvas.height < 1) return null

    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    // HTML canvas origin is top-left; flip on upload so shader UVs stay bottom-left oriented.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    if (this.editorWidth !== editorCanvas.width || this.editorHeight !== editorCanvas.height) {
      this.editorWidth = editorCanvas.width
      this.editorHeight = editorCanvas.height
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, editorCanvas)
    }
    else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, editorCanvas)
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    return texture
  }

  private ensureSceneTarget(width: number, height: number): boolean {
    const gl = this.gl
    const sceneTexture = this.sceneTexture
    const sceneFramebuffer = this.sceneFramebuffer
    if (!gl || !sceneTexture || !sceneFramebuffer) return false
    if (this.sceneWidth === width && this.sceneHeight === height) return true

    gl.bindTexture(gl.TEXTURE_2D, sceneTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFramebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTexture, 0)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    if (status !== gl.FRAMEBUFFER_COMPLETE) return false
    this.sceneWidth = width
    this.sceneHeight = height
    return true
  }

  private ensureFeedbackTargets(width: number, height: number): boolean {
    const gl = this.gl
    if (!gl) return false

    const sameSize = this.feedbackWidth === width && this.feedbackHeight === height
    if (sameSize && !this.feedbackNeedsClear) return true

    for (let i = 0; i < 2; i++) {
      const tex = this.feedbackTextures[i]
      const fb = this.feedbackFramebuffers[i]
      if (!tex || !fb) return false
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        return false
      }
    }

    this.feedbackWidth = width
    this.feedbackHeight = height
    this.feedbackReadIndex = 0
    this.feedbackNeedsClear = false
    this.clearFeedbackTargets(width, height)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return true
  }

  private clearFeedbackTargets(width: number, height: number) {
    const gl = this.gl
    if (!gl) return
    gl.clearColor(0.01, 0.01, 0.015, 1)
    for (const fb of this.feedbackFramebuffers) {
      if (!fb) continue
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.viewport(0, 0, width, height)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
  }

  private drawFastDefault(timeSeconds: number, width: number, height: number, audioData: Float32Array) {
    const gl = this.gl
    const lineProgram = this.lineProgram
    const lineBuffer = this.lineBuffer
    if (!gl || !lineProgram || !lineBuffer) return

    const aspect = width > 0 ? (height / width) : 1
    const intensity = 1 // 0.72 + 0.28 * Math.sin(timeSeconds * 2.5)

    gl.useProgram(lineProgram.program)
    if (lineProgram.aspectLocation) gl.uniform1f(lineProgram.aspectLocation, aspect)
    if (lineProgram.intensityLocation) gl.uniform1f(lineProgram.intensityLocation, intensity)
    if (lineProgram.primaryColorLocation) {
      gl.uniform3f(lineProgram.primaryColorLocation, 1, 1, 1) /// this.primaryColor[0], this.primaryColor[1], this.primaryColor[2])
    }

    const points = this.buildPresetData(audioData, timeSeconds)

    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, points)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, AUDIO_TEXTURE_WIDTH)
  }

  private buildPresetData(audioData: Float32Array, timeSeconds: number): Float32Array {
    if (this.preset === 'lissajous') return audioData

    const out = this.presetData
    const n = AUDIO_TEXTURE_WIDTH

    if (this.preset === 'scope') {
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 2 - 1
        const l = audioData[i * 2] ?? 0
        const r = audioData[i * 2 + 1] ?? 0
        const y = (l + r) * 0.5
        out[i * 2] = t
        out[i * 2 + 1] = clamp11(y * 0.92)
      }
      return out
    }

    if (this.preset === 'orbit') {
      const phase = timeSeconds * 0.6
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1)
        const theta = t * TWO_PI + phase
        const l = audioData[i * 2] ?? 0
        const r = audioData[i * 2 + 1] ?? 0
        const radius = 0.2 + 0.6 * (0.5 + 0.5 * (l + r) * 0.5)
        out[i * 2] = Math.cos(theta) * radius
        out[i * 2 + 1] = Math.sin(theta) * radius
      }
      return out
    }

    if (this.preset === 'plasma') {
      const phase = timeSeconds * 1.2
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1)
        const p = t * TWO_PI
        const l = audioData[i * 2] ?? 0
        const r = audioData[i * 2 + 1] ?? 0
        const sx = Math.sin(p * 3.0 + phase) * 0.7 + Math.sin(p * 11.0 - phase * 1.7) * 0.2
        const sy = Math.sin(p * 4.0 + phase * 1.1) * 0.7 + Math.sin(p * 9.0 + phase * 0.6) * 0.2
        out[i * 2] = clamp11(sx + r * 0.18)
        out[i * 2 + 1] = clamp11(sy + l * 0.18)
      }
      return out
    }

    if (this.preset === 'tunnel') {
      const phase = timeSeconds * 1.4
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1)
        const l = audioData[i * 2] ?? 0
        const r = audioData[i * 2 + 1] ?? 0
        const angle = t * TWO_PI * 6.0 + phase
        const radius = clamp11(0.95 - t * 0.88 + (l + r) * 0.05)
        out[i * 2] = clamp11(Math.cos(angle) * radius + r * 0.08)
        out[i * 2 + 1] = clamp11(Math.sin(angle) * radius + l * 0.08)
      }
      return out
    }

    if (this.preset === 'rotozoom') {
      const phase = timeSeconds * 0.9
      const c = Math.cos(phase)
      const s = Math.sin(phase)
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1)) * 2 - 1
        const l = audioData[i * 2] ?? 0
        const r = audioData[i * 2 + 1] ?? 0
        const wave = Math.sin((u + phase * 0.35) * 12.0) * 0.18
        const x = clamp11(u + r * 0.16 + wave)
        const y = clamp11((l + r) * 0.46 + l * 0.14 + Math.cos((u - phase * 0.25) * 10.0) * 0.1)
        out[i * 2] = clamp11(x * c - y * s)
        out[i * 2 + 1] = clamp11(x * s + y * c)
      }
      return out
    }

    if (this.preset === 'ribbon') {
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 2 - 1
        const l = audioData[i * 2] ?? 0
        const r = audioData[i * 2 + 1] ?? 0
        const y = (l + r) * 0.45
        out[i * 2] = clamp11(t + r * 0.18)
        out[i * 2 + 1] = clamp11(y + l * 0.18)
      }
      return out
    }

    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * 2 - 1
      const l = audioData[i * 2] ?? 0
      const r = audioData[i * 2 + 1] ?? 0
      const y = (l + r) * 0.45
      out[i * 2] = clamp11(t + r * 0.18)
      out[i * 2 + 1] = clamp11(y + l * 0.18)
    }
    return out
  }

  private drawCustom(timeSeconds: number, width: number, height: number) {
    const gl = this.gl
    const program = this.customProgram
    const texture = this.texture
    if (!gl || !program || !texture) return

    gl.useProgram(program.program)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    if (program.audioLocation) gl.uniform1i(program.audioLocation, 1)
    if (program.timeLocation) gl.uniform1f(program.timeLocation, timeSeconds)
    if (program.resolutionLocation) gl.uniform2f(program.resolutionLocation, width, height)
    if (program.primaryColorLocation) {
      gl.uniform3f(program.primaryColorLocation, this.primaryColor[0], this.primaryColor[1], this.primaryColor[2])
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  private drawPreset3D(
    preset: ShaderPresetName,
    timeSeconds: number,
    width: number,
    height: number,
    audioData: Float32Array,
  ) {
    const gl = this.gl
    const texture = this.texture
    if (!gl || !texture) return
    const presetProgram = this.getPreset3DProgram(preset)
    if (!presetProgram) {
      this.drawFastDefault(timeSeconds, width, height, audioData)
      return
    }
    gl.useProgram(presetProgram.program)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    if (presetProgram.audioLocation) gl.uniform1i(presetProgram.audioLocation, 1)
    if (presetProgram.timeLocation) gl.uniform1f(presetProgram.timeLocation, timeSeconds)
    if (presetProgram.resolutionLocation) gl.uniform2f(presetProgram.resolutionLocation, width, height)
    if (presetProgram.primaryColorLocation) {
      gl.uniform3f(
        presetProgram.primaryColorLocation,
        this.primaryColor[0],
        this.primaryColor[1],
        this.primaryColor[2],
      )
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  private drawPost(
    timeSeconds: number,
    width: number,
    height: number,
    sourceTexture: WebGLTexture,
    feedbackTexture: WebGLTexture,
  ) {
    const gl = this.gl
    const post = this.postProgram
    const audioTexture = this.texture
    if (!gl || !post || !audioTexture) return

    gl.useProgram(post.program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, audioTexture)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, feedbackTexture)

    if (post.sceneLocation) gl.uniform1i(post.sceneLocation, 0)
    if (post.audioLocation) gl.uniform1i(post.audioLocation, 1)
    if (post.feedbackLocation) gl.uniform1i(post.feedbackLocation, 2)
    if (post.timeLocation) gl.uniform1f(post.timeLocation, timeSeconds)
    if (post.resolutionLocation) gl.uniform2f(post.resolutionLocation, width, height)
    if (post.primaryColorLocation) {
      gl.uniform3f(post.primaryColorLocation, this.primaryColor[0], this.primaryColor[1], this.primaryColor[2])
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  private drawBlit(texture: WebGLTexture) {
    const gl = this.gl
    const blit = this.blitProgram
    if (!gl || !blit) return
    gl.useProgram(blit.program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    if (blit.sourceLocation) gl.uniform1i(blit.sourceLocation, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  private createFastLineProgram(): FastLineProgram | { error: RuntimeShaderError } {
    const linked = this.linkProgram(FAST_LINE_VERTEX_SHADER, FAST_LINE_FRAGMENT_SHADER)
    if ('error' in linked) return linked
    const { program } = linked
    return {
      program,
      aspectLocation: this.gl!.getUniformLocation(program, 'u_aspect'),
      intensityLocation: this.gl!.getUniformLocation(program, 'u_intensity'),
      primaryColorLocation: this.gl!.getUniformLocation(program, 'u_primaryColor'),
    }
  }

  private createCustomProgram(vertexSource: string, fragmentSource: string): CustomProgram | {
    error: RuntimeShaderError
  } {
    const linked = this.linkProgram(vertexSource, fragmentSource)
    if ('error' in linked) return linked
    const { program } = linked
    return {
      program,
      audioLocation: this.gl!.getUniformLocation(program, 'u_audio'),
      timeLocation: this.gl!.getUniformLocation(program, 'u_time'),
      resolutionLocation: this.gl!.getUniformLocation(program, 'u_resolution'),
      primaryColorLocation: this.gl!.getUniformLocation(program, 'u_primaryColor'),
    }
  }

  private getPreset3DProgram(preset: ShaderPresetName): CustomProgram | null {
    const fragmentSource = PRESET_3D_FRAGMENTS[preset]
    if (!fragmentSource) return null
    const existing = this.presetPrograms[preset]
    if (existing) return existing

    const created = this.createCustomProgram(FULLSCREEN_STRIP_VERTEX_SHADER, fragmentSource)
    if ('error' in created) {
      console.error(`Preset shader "${preset}" failed: ${created.error.message}`)
      return null
    }
    this.presetPrograms[preset] = created
    return created
  }

  private createPostProgram(fragmentSource: string): PostProgram | { error: RuntimeShaderError } {
    const linked = this.linkProgram(FULLSCREEN_PASS_VERTEX_SHADER, fragmentSource, 'postfragment')
    if ('error' in linked) return linked
    const { program } = linked
    return {
      program,
      sceneLocation: this.gl!.getUniformLocation(program, 'u_scene'),
      feedbackLocation: this.gl!.getUniformLocation(program, 'u_feedback'),
      audioLocation: this.gl!.getUniformLocation(program, 'u_audio'),
      timeLocation: this.gl!.getUniformLocation(program, 'u_time'),
      resolutionLocation: this.gl!.getUniformLocation(program, 'u_resolution'),
      primaryColorLocation: this.gl!.getUniformLocation(program, 'u_primaryColor'),
    }
  }

  private createBlitProgram(): BlitProgram | { error: RuntimeShaderError } {
    const linked = this.linkProgram(FULLSCREEN_PASS_VERTEX_SHADER, BLIT_FRAGMENT_SHADER, 'fragment')
    if ('error' in linked) return linked
    const { program } = linked
    return {
      program,
      sourceLocation: this.gl!.getUniformLocation(program, 'u_source'),
    }
  }

  private linkProgram(
    vertexSource: string,
    fragmentSource: string,
    fragmentStage: ShaderStage = 'fragment',
  ): { program: WebGLProgram } | {
    error: RuntimeShaderError
  } {
    const gl = this.gl
    if (!gl) {
      return {
        error: { stage: fragmentStage, message: 'WebGL2 context is unavailable' },
      }
    }

    const vertex = this.createShader(gl.VERTEX_SHADER, vertexSource, 'vertex')
    if ('error' in vertex) return vertex
    const fragment = this.createShader(gl.FRAGMENT_SHADER, fragmentSource, fragmentStage)
    if ('error' in fragment) {
      gl.deleteShader(vertex.shader)
      return fragment
    }

    const program = gl.createProgram()
    if (!program) {
      gl.deleteShader(vertex.shader)
      gl.deleteShader(fragment.shader)
      return {
        error: { stage: fragmentStage, message: 'Failed to create shader program' },
      }
    }
    gl.attachShader(program, vertex.shader)
    gl.attachShader(program, fragment.shader)
    gl.linkProgram(program)
    gl.deleteShader(vertex.shader)
    gl.deleteShader(fragment.shader)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || 'Unknown link error'
      gl.deleteProgram(program)
      return {
        error: { stage: fragmentStage, message: `Shader link failed: ${log}` },
      }
    }

    return { program }
  }

  private createShader(
    type: number,
    source: string,
    stage: ShaderStage,
  ): { shader: WebGLShader } | { error: RuntimeShaderError } {
    const gl = this.gl
    if (!gl) {
      return { error: { stage, message: `${stage} shader failed: WebGL2 context is unavailable` } }
    }
    const shader = gl.createShader(type)
    if (!shader) {
      return { error: { stage, message: `${stage} shader failed: could not allocate shader` } }
    }
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || 'Unknown compile error'
      gl.deleteShader(shader)
      return {
        error: { stage, message: `${stage} shader compile failed: ${log}` },
      }
    }
    return { shader }
  }
}

function setShaderRuntimeDiagnostic(
  programCtx: DspProgramContext,
  error: RuntimeShaderError | null,
) {
  if (!error) {
    programCtx.shaderRuntimeDiagnostic.value = null
    return
  }
  const loc = error.stage === 'vertex'
    ? (programCtx.shaderLocations.value.vertex ?? programCtx.shaderLocations.value.fragment)
    : error.stage === 'postfragment'
    ? (
      programCtx.shaderLocations.value.postfragment
        ?? programCtx.shaderLocations.value.postshader
        ?? programCtx.shaderLocations.value.fragment
        ?? programCtx.shaderLocations.value.vertex
    )
    : (
      programCtx.shaderLocations.value.fragment
        ?? programCtx.shaderLocations.value.vertex
    )
  if (!loc) {
    programCtx.shaderRuntimeDiagnostic.value = null
    return
  }
  programCtx.shaderRuntimeDiagnostic.value = {
    message: error.message,
    loc,
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

function clamp11(x: number): number {
  return Math.max(-1, Math.min(1, x))
}

export const ShaderCanvas = () => {
  const ref = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<ShaderRenderer | null>(null)
  const tapRef = useRef(new StereoAudioTap())
  const audioDataRef = useRef(new Float32Array(AUDIO_TEXTURE_WIDTH * 2))
  const activeProgramCtxRef = useRef<DspProgramContext | null>(null)
  const rafIdRef = useRef<number | null>(null)

  const cancelFrame = () => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }

  const drawFrame = () => {
    rafIdRef.current = null
    if (settings.showShaders !== true) return

    const renderer = rendererRef.current
    const canvas = ref.current
    const programCtx = currentProgramContext.value

    if (!renderer || !canvas || !programCtx) {
      rafIdRef.current = requestAnimationFrame(drawFrame)
      return
    }

    if (activeProgramCtxRef.current && activeProgramCtxRef.current !== programCtx) {
      activeProgramCtxRef.current.shaderRuntimeDiagnostic.value = null
    }
    activeProgramCtxRef.current = programCtx

    renderer.setPrimaryColor(theme.value.red)
    const error = renderer.setShaders(
      programCtx.shaderSources.value.vertex,
      programCtx.shaderSources.value.fragment,
      programCtx.shaderSources.value.shader,
      programCtx.shaderSources.value.shaderinput,
      programCtx.shaderSources.value.postfragment,
      programCtx.shaderSources.value.postshader,
    )
    setShaderRuntimeDiagnostic(programCtx, error)
    tapRef.current.fillAudio(audioDataRef.current)
    renderer.draw(
      canvas,
      programCtx.timeSeconds.value ?? 0,
      audioDataRef.current,
    )

    rafIdRef.current = requestAnimationFrame(drawFrame)
  }

  const ensureFrameLoop = () => {
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(drawFrame)
    }
  }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const renderer = new ShaderRenderer()
    if (!renderer.init(canvas)) return
    rendererRef.current = renderer
    renderer.setPrimaryColor(primaryColor.value)
    if (settings.showShaders === true && currentProgramContext.value) {
      activeProgramCtxRef.current = currentProgramContext.value
      const error = renderer.setShaders(
        currentProgramContext.value.shaderSources.value.vertex,
        currentProgramContext.value.shaderSources.value.fragment,
        currentProgramContext.value.shaderSources.value.shader,
        currentProgramContext.value.shaderSources.value.shaderinput,
        currentProgramContext.value.shaderSources.value.postfragment,
        currentProgramContext.value.shaderSources.value.postshader,
      )
      setShaderRuntimeDiagnostic(currentProgramContext.value, error)
      ensureFrameLoop()
    }

    return () => {
      cancelFrame()
      if (activeProgramCtxRef.current) {
        activeProgramCtxRef.current.shaderRuntimeDiagnostic.value = null
      }
      activeProgramCtxRef.current = null
      tapRef.current.disconnect()
      renderer.dispose()
      rendererRef.current = null
    }
  }, [])

  useReactiveEffect(() => {
    if (settings.showShaders !== true) {
      cancelFrame()
      tapRef.current.disconnect()
      if (activeProgramCtxRef.current) {
        activeProgramCtxRef.current.shaderRuntimeDiagnostic.value = null
      }
      return
    }
    tapRef.current.connect()
    ensureFrameLoop()
  })

  return (
    <canvas
      ref={ref}
      class="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
