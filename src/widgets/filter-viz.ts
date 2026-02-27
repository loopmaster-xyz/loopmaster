function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

const DIODELADDER_Q_COMP = 2.5
const DIODELADDER_K_COMP = 1

type BiquadCoeffs = {
  a0: number
  a1: number
  a2: number
  b0: number
  b1: number
  b2: number
}

function biquadCoeffs(type: string, cutHz: number, q: number, gainDb: number, sampleRate: number): BiquadCoeffs {
  const nyquist = Math.max(1, sampleRate / 2)
  const freq = clamp(cutHz, 20, nyquist)
  const Q = clamp(q, 0.01, 20)
  const gain = clamp(gainDb, -40, 40)
  const omega = (Math.PI * 2 * freq) / sampleRate
  const sn = Math.sin(omega)
  const cs = Math.cos(omega)

  if (type === 'lp') {
    const alpha = sn / (2 * Q)
    return {
      b0: (1 - cs) / 2,
      b1: 1 - cs,
      b2: (1 - cs) / 2,
      a0: 1 + alpha,
      a1: -2 * cs,
      a2: 1 - alpha,
    }
  }

  if (type === 'hp') {
    const alpha = sn / (2 * Q)
    return {
      b0: (1 + cs) / 2,
      b1: -(1 + cs),
      b2: (1 + cs) / 2,
      a0: 1 + alpha,
      a1: -2 * cs,
      a2: 1 - alpha,
    }
  }

  if (type === 'bp') {
    const alpha = sn / (2 * Q)
    return {
      b0: alpha,
      b1: 0,
      b2: -alpha,
      a0: 1 + alpha,
      a1: -2 * cs,
      a2: 1 - alpha,
    }
  }

  if (type === 'bs') {
    const alpha = sn / (2 * Q)
    return {
      b0: 1,
      b1: -2 * cs,
      b2: 1,
      a0: 1 + alpha,
      a1: -2 * cs,
      a2: 1 - alpha,
    }
  }

  if (type === 'ls') {
    const A = Math.pow(10, gain / 40)
    const beta = Math.sqrt(A) / 1
    return {
      b0: A * (A + 1 - (A - 1) * cs + beta * sn),
      b1: 2 * A * (A - 1 - (A + 1) * cs),
      b2: A * (A + 1 - (A - 1) * cs - beta * sn),
      a0: A + 1 + (A - 1) * cs + beta * sn,
      a1: -2 * (A - 1 + (A + 1) * cs),
      a2: A + 1 + (A - 1) * cs - beta * sn,
    }
  }

  if (type === 'hs') {
    const A = Math.pow(10, gain / 40)
    const beta = Math.sqrt(A) / 1
    return {
      b0: A * (A + 1 + (A - 1) * cs + beta * sn),
      b1: -2 * A * (A - 1 + (A + 1) * cs),
      b2: A * (A + 1 + (A - 1) * cs - beta * sn),
      a0: A + 1 - (A - 1) * cs + beta * sn,
      a1: 2 * (A - 1 - (A + 1) * cs),
      a2: A + 1 - (A - 1) * cs - beta * sn,
    }
  }

  if (type === 'peak') {
    const A = Math.pow(10, gain / 40)
    const alpha = sn / (2 * Q)
    return {
      b0: 1 + alpha * A,
      b1: -2 * cs,
      b2: 1 - alpha * A,
      a0: 1 + alpha / A,
      a1: -2 * cs,
      a2: 1 - alpha / A,
    }
  }

  if (type === 'ap') {
    const alpha = sn / (2 * Q)
    return {
      b0: 1 - alpha,
      b1: -2 * cs,
      b2: 1 + alpha,
      a0: 1 + alpha,
      a1: -2 * cs,
      a2: 1 - alpha,
    }
  }

  return { a0: 1, a1: 0, a2: 0, b0: 1, b1: 0, b2: 0 }
}

function svfMagDb(type: string, freqHz: number, cutHz: number, q: number, sampleRate: number): number {
  const nyquist = Math.max(1, sampleRate / 2)
  const cut = clamp(cutHz, 50, nyquist)
  const Q = clamp(q, 0.01, 0.985)

  const g = Math.tan((Math.PI * cut) / sampleRate)
  const k = 2.0 - 2.0 * Q
  const a1 = 1.0 / (1.0 + g * (g + k))
  const a2 = g * a1
  const a3 = g * a2

  const A11 = 2 * a1 - 1
  const A12 = -2 * a2
  const A21 = 2 * a2
  const A22 = 1 - 2 * a3
  const B1 = 2 * a2
  const B2 = 2 * a3

  let C1 = 0
  let C2 = 0
  let D = 0

  if (type === 'lps') {
    C1 = a2
    C2 = 1 - a3
    D = a3
  }
  else if (type === 'bps') {
    C1 = a1
    C2 = -a2
    D = a2
  }
  else if (type === 'hps') {
    C1 = -k * a1 - a2
    C2 = k * a2 - (1 - a3)
    D = 1 - k * a2 - a3
  }
  else if (type === 'bss') {
    C1 = -k * a1
    C2 = k * a2
    D = 1 - k * a2
  }
  else if (type === 'peaks') {
    C1 = -k * a1 - 2 * a2
    C2 = k * a2 - 2 * (1 - a3)
    D = 1 - k * a2 - 2 * a3
  }
  else if (type === 'aps') {
    C1 = -2 * k * a1
    C2 = 2 * k * a2
    D = 1 - 2 * k * a2
  }

  const w = (Math.PI * 2 * clamp(freqHz, 1e-6, nyquist)) / sampleRate
  const zr = Math.cos(w)
  const zi = Math.sin(w)

  const m11r = zr - A11
  const m11i = zi
  const m22r = zr - A22
  const m22i = zi
  const m12r = -A12
  const m21r = -A21

  const p1r = m11r * m22r - m11i * m22i
  const p1i = m11r * m22i + m11i * m22r
  const p2r = m12r * m21r
  const detr = p1r - p2r
  const deti = p1i
  const den = detr * detr + deti * deti
  if (den <= 0) return -240

  const y1r = m22r * B1 + (-m12r) * B2
  const y1i = m22i * B1
  const y2r = (-m21r) * B1 + m11r * B2
  const y2i = m11i * B2

  const x1r = (y1r * detr + y1i * deti) / den
  const x1i = (y1i * detr - y1r * deti) / den
  const x2r = (y2r * detr + y2i * deti) / den
  const x2i = (y2i * detr - y2r * deti) / den

  const Hr = C1 * x1r + C2 * x2r + D
  const Hi = C1 * x1i + C2 * x2i
  const mag = Math.sqrt(Hr * Hr + Hi * Hi)
  return 20 * Math.log10(Math.max(1e-12, mag))
}

function moogMagDb(type: string, freqHz: number, cutHz: number, q: number, sampleRate: number): number {
  const nyquist = Math.max(1, sampleRate / 2)
  const freq = clamp(cutHz, 50, nyquist)
  const Q = clamp(q, 0.01, 0.985)

  const kVt = 1.2
  const v2 = 2.0 + kVt
  const kfc = freq / sampleRate
  const kfcr = 1.873 * (kfc * kfc * kfc) + 0.4955 * (kfc * kfc) - 0.649 * kfc + 0.9988
  const expOut = Math.exp(-2.0 * Math.PI * kfcr * kfc)
  const k2vg = v2 * (1.0 - expOut)
  const kacr = Q * (-3.9364 * (kfc * kfc) + 1.8409 * kfc + 0.9968)
  const postGain = 1.0001784074555027 + 0.9331585678097162 * Q

  const g = k2vg / v2
  const oneMinusG = 1 - g
  if (Math.abs(oneMinusG) < 1e-9) return -240

  const A11 = oneMinusG
  const A12 = 0
  const A13 = 0
  const A14 = -g * kacr

  const A21 = g * oneMinusG
  const A22 = oneMinusG
  const A23 = 0
  const A24 = -(g * g) * kacr

  const A31 = (g * g) * oneMinusG
  const A32 = g * oneMinusG
  const A33 = oneMinusG
  const A34 = -(g * g * g) * kacr

  const A41 = (g * g * g) * oneMinusG
  const A42 = (g * g) * oneMinusG
  const A43 = g * oneMinusG
  const A44 = oneMinusG - (g * g * g * g) * kacr

  const B1 = g * oneMinusG
  const B2 = (g * g) * oneMinusG
  const B3 = (g * g * g) * oneMinusG
  const B4 = (g * g * g * g) * oneMinusG

  let C1 = 0
  let C2 = 0
  let C3 = 0
  let C4 = 0
  let D = 0

  {
    const g2 = g * g
    const g3 = g2 * g
    const g4 = g2 * g2

    if (type === 'lpm') {
      C1 = postGain * g3
      C2 = postGain * g2
      C3 = postGain * g
      C4 = postGain * (1 - (g4 * kacr) / oneMinusG)
      D = postGain * g4
    }
    else {
      C1 = postGain * (g2 * (-3 + 2 * g))
      C2 = postGain * (g * (-3 + 2 * g))
      C3 = postGain * (-3 + 2 * g)
      C4 = postGain * (2 + (kacr * (-1 + 3 * g3 - 2 * g4)) / oneMinusG)
      D = postGain * (1 - 3 * g3 + 2 * g4)
    }
  }

  const w = (Math.PI * 2 * clamp(freqHz, 1e-6, nyquist)) / sampleRate
  const zr = Math.cos(w)
  const zi = Math.sin(w)

  const mr = new Float64Array(16)
  const mi = new Float64Array(16)
  const br = new Float64Array(4)
  const bi = new Float64Array(4)

  mr[0] = zr - A11
  mi[0] = zi
  mr[1] = -A12
  mi[1] = 0
  mr[2] = -A13
  mi[2] = 0
  mr[3] = -A14
  mi[3] = 0

  mr[4] = -A21
  mi[4] = 0
  mr[5] = zr - A22
  mi[5] = zi
  mr[6] = -A23
  mi[6] = 0
  mr[7] = -A24
  mi[7] = 0

  mr[8] = -A31
  mi[8] = 0
  mr[9] = -A32
  mi[9] = 0
  mr[10] = zr - A33
  mi[10] = zi
  mr[11] = -A34
  mi[11] = 0

  mr[12] = -A41
  mi[12] = 0
  mr[13] = -A42
  mi[13] = 0
  mr[14] = -A43
  mi[14] = 0
  mr[15] = zr - A44
  mi[15] = zi

  br[0] = B1
  bi[0] = 0
  br[1] = B2
  bi[1] = 0
  br[2] = B3
  bi[2] = 0
  br[3] = B4
  bi[3] = 0

  const n = 4
  for (let k = 0; k < n; k++) {
    let piv = k
    let best = 0
    for (let r = k; r < n; r++) {
      const idx = r * 4 + k
      const mag2 = mr[idx]! * mr[idx]! + mi[idx]! * mi[idx]!
      if (mag2 > best) {
        best = mag2
        piv = r
      }
    }
    if (best < 1e-18) return -240

    if (piv !== k) {
      for (let c = k; c < n; c++) {
        const a = k * 4 + c
        const b = piv * 4 + c
        const tr = mr[a]!
        mr[a] = mr[b]!
        mr[b] = tr
        const ti = mi[a]!
        mi[a] = mi[b]!
        mi[b] = ti
      }
      const trb = br[k]!
      br[k] = br[piv]!
      br[piv] = trb
      const tib = bi[k]!
      bi[k] = bi[piv]!
      bi[piv] = tib
    }

    const kk = k * 4 + k
    const pr = mr[kk]!
    const pi = mi[kk]!
    const inv = 1 / (pr * pr + pi * pi)
    const invr = pr * inv
    const invi = -pi * inv

    for (let c = k; c < n; c++) {
      const idx = k * 4 + c
      const ar = mr[idx]!
      const ai = mi[idx]!
      mr[idx] = ar * invr - ai * invi
      mi[idx] = ar * invi + ai * invr
    }
    {
      const ar = br[k]!
      const ai = bi[k]!
      br[k] = ar * invr - ai * invi
      bi[k] = ar * invi + ai * invr
    }

    for (let r = 0; r < n; r++) {
      if (r === k) continue
      const rk = r * 4 + k
      const fr = mr[rk]!
      const fi = mi[rk]!
      if (fr === 0 && fi === 0) continue

      for (let c = k; c < n; c++) {
        const rc = r * 4 + c
        const kc = k * 4 + c
        const ar = mr[kc]!
        const ai = mi[kc]!
        mr[rc] -= fr * ar - fi * ai
        mi[rc] -= fr * ai + fi * ar
      }
      br[r] -= fr * br[k]! - fi * bi[k]!
      bi[r] -= fr * bi[k]! + fi * br[k]!
    }
  }

  const Hr = C1 * br[0]! + C2 * br[1]! + C3 * br[2]! + C4 * br[3]! + D
  const Hi = C1 * bi[0]! + C2 * bi[1]! + C3 * bi[2]! + C4 * bi[3]!
  const mag = Math.sqrt(Hr * Hr + Hi * Hi)
  return 20 * Math.log10(Math.max(1e-12, mag))
}

function diodeLadderMagDb(freqHz: number, cutHz: number, q: number, k: number, sampleRate: number): number {
  const nyquist = Math.max(1, sampleRate / 2)
  const cut = clamp(cutHz, 20, nyquist)
  const qClamped = clamp(q, 0, 1)
  const kClamped = clamp(k, 0, 1)

  const K = kClamped * Math.PI
  const ah = (K - 2.0) / (K + 2.0)
  const bh = 2.0 / (K + 2.0)

  const fbk = 20.0 * qClamped
  const outA = 1.0 + 0.5 * fbk

  const cutNorm = cut / nyquist
  const qq = qClamped * qClamped
  const comp = 1.0 + DIODELADDER_Q_COMP * qq + DIODELADDER_K_COMP * (kClamped * qClamped)
  const cutComp = clamp((cutNorm / comp) * nyquist, 20, nyquist)

  let a = Math.PI * (cutComp / nyquist)
  a = 2.0 * Math.tan(0.5 * a)
  const ainv = 1.0 / a
  const a2 = a * a
  const b = 2.0 * a + 1.0
  const b2 = b * b
  const c = 1.0 / (2.0 * a2 * a2 - 4.0 * a2 * b2 + b2 * b2)
  const g0 = 2.0 * a2 * a2 * c
  const g = g0 * bh

  const sat = 1.0
  const soft = (x: number) => x / (1.0 / sat + Math.abs(x))

  const step = (x: Float64Array, u: number): { x1: Float64Array; y: number } => {
    const z0 = x[0]!
    const z1 = x[1]!
    const z2 = x[2]!
    const z3 = x[3]!
    const z4 = x[4]!

    const s0 = (a2 * a * z0
      + a2 * b * z1
      + z2 * (b2 - 2.0 * a2) * a
      + z3 * (b2 - 3.0 * a2) * b) * c
    const s = bh * s0 - z4

    let y5 = (g * u + s) / (1.0 + g * fbk)

    const y0 = soft(u - fbk * y5)
    y5 = g * y0 + s

    const y4 = g0 * y0 + s0
    const y3 = (b * y4 - z3) * ainv
    const y2 = (b * y3 - a * y4 - z2) * ainv
    const y1 = (b * y2 - a * y3 - z1) * ainv

    const x1 = new Float64Array(5)
    x1[0] = z0 + 4.0 * a * (y0 - y1 + y2)
    x1[1] = z1 + 2.0 * a * (y1 - 2.0 * y2 + y3)
    x1[2] = z2 + 2.0 * a * (y2 - 2.0 * y3 + y4)
    x1[3] = z3 + 2.0 * a * (y3 - 2.0 * y4)
    x1[4] = bh * y4 + ah * y5

    return { x1, y: outA * y4 }
  }

  const n = 5
  const eps = 1e-6
  const x0 = new Float64Array(n)
  const base = step(x0, 0)

  const A = new Float64Array(n * n)
  const B = new Float64Array(n)
  const C = new Float64Array(n)
  let D = 0

  for (let j = 0; j < n; j++) {
    const xj = new Float64Array(n)
    xj[j] = eps
    const r = step(xj, 0)
    for (let i = 0; i < n; i++) {
      A[i * n + j] = (r.x1[i]! - base.x1[i]!) / eps
    }
    C[j] = (r.y - base.y) / eps
  }
  {
    const r = step(x0, eps)
    for (let i = 0; i < n; i++) {
      B[i] = (r.x1[i]! - base.x1[i]!) / eps
    }
    D = (r.y - base.y) / eps
  }

  const w = (Math.PI * 2 * clamp(freqHz, 1e-6, nyquist)) / sampleRate
  const zr = Math.cos(w)
  const zi = Math.sin(w)

  const mr = new Float64Array(n * n)
  const mi = new Float64Array(n * n)
  const br = new Float64Array(n)
  const bi = new Float64Array(n)

  for (let r = 0; r < n; r++) {
    for (let c2 = 0; c2 < n; c2++) {
      const idx = r * n + c2
      mr[idx] = (r === c2 ? zr : 0) - A[idx]
      mi[idx] = r === c2 ? zi : 0
    }
    br[r] = B[r]!
    bi[r] = 0
  }

  for (let k2 = 0; k2 < n; k2++) {
    let piv = k2
    let best = 0
    for (let r = k2; r < n; r++) {
      const idx = r * n + k2
      const mag2 = mr[idx]! * mr[idx]! + mi[idx]! * mi[idx]!
      if (mag2 > best) {
        best = mag2
        piv = r
      }
    }
    if (best < 1e-18) return -240

    if (piv !== k2) {
      for (let c2 = k2; c2 < n; c2++) {
        const aidx = k2 * n + c2
        const bidx = piv * n + c2
        const tr = mr[aidx]!
        mr[aidx] = mr[bidx]!
        mr[bidx] = tr
        const ti = mi[aidx]!
        mi[aidx] = mi[bidx]!
        mi[bidx] = ti
      }
      const trb = br[k2]!
      br[k2] = br[piv]!
      br[piv] = trb
      const tib = bi[k2]!
      bi[k2] = bi[piv]!
      bi[piv] = tib
    }

    const kk = k2 * n + k2
    const pr = mr[kk]!
    const pi = mi[kk]!
    const inv = 1 / (pr * pr + pi * pi)
    const invr = pr * inv
    const invi = -pi * inv

    for (let c2 = k2; c2 < n; c2++) {
      const idx = k2 * n + c2
      const ar = mr[idx]!
      const ai = mi[idx]!
      mr[idx] = ar * invr - ai * invi
      mi[idx] = ar * invi + ai * invr
    }
    {
      const ar = br[k2]!
      const ai = bi[k2]!
      br[k2] = ar * invr - ai * invi
      bi[k2] = ar * invi + ai * invr
    }

    for (let r = 0; r < n; r++) {
      if (r === k2) continue
      const rk = r * n + k2
      const fr = mr[rk]!
      const fi = mi[rk]!
      if (fr === 0 && fi === 0) continue

      for (let c2 = k2; c2 < n; c2++) {
        const rc = r * n + c2
        const kc = k2 * n + c2
        const ar = mr[kc]!
        const ai = mi[kc]!
        mr[rc] -= fr * ar - fi * ai
        mi[rc] -= fr * ai + fi * ar
      }
      br[r] -= fr * br[k2]! - fi * bi[k2]!
      bi[r] -= fr * bi[k2]! + fi * br[k2]!
    }
  }

  let Hr = D
  let Hi = 0
  for (let i = 0; i < n; i++) {
    Hr += C[i]! * br[i]!
    Hi += C[i]! * bi[i]!
  }

  const mag = Math.sqrt(Hr * Hr + Hi * Hi)
  return 20 * Math.log10(Math.max(1e-12, mag))
}

function onePoleMagDb(type: string, freqHz: number, cutHz: number, sampleRate: number): number {
  const nyquist = sampleRate / 2
  const cut = clamp(cutHz, 20, nyquist)
  const a = Math.exp((-2.0 * Math.PI * cut) / sampleRate)
  const b = 1.0 - a

  const w = (Math.PI * 2 * clamp(freqHz, 1e-6, nyquist)) / sampleRate
  const cos1 = Math.cos(w)
  const sin1 = Math.sin(w)

  let nr: number, ni: number, dr: number, di: number
  if (type === 'lp1') {
    nr = b
    ni = 0
    dr = 1 - (1 - b) * cos1
    di = (1 - b) * sin1
  }
  else {
    nr = (1 - b) * (1 - cos1)
    ni = (1 - b) * (0 + sin1)
    dr = 1 - (1 - b) * cos1
    di = (1 - b) * sin1
  }

  const n2 = nr * nr + ni * ni
  const d2 = dr * dr + di * di
  const mag = d2 > 0 ? Math.sqrt(n2 / d2) : 1
  const m = Math.max(1e-12, mag)
  return 20 * Math.log10(m)
}

function biquadMagDb(type: string, freqHz: number, cutHz: number, q: number, gainDb: number,
  sampleRate: number): number
{
  const { a0, a1, a2, b0, b1, b2 } = biquadCoeffs(type, cutHz, q, gainDb, sampleRate)
  const w = (Math.PI * 2 * clamp(freqHz, 1e-6, sampleRate / 2)) / sampleRate
  const cos1 = Math.cos(w)
  const sin1 = Math.sin(w)
  const cos2 = Math.cos(2 * w)
  const sin2 = Math.sin(2 * w)

  const nr = b0 + b1 * cos1 + b2 * cos2
  const ni = -(b1 * sin1 + b2 * sin2)
  const dr = a0 + a1 * cos1 + a2 * cos2
  const di = -(a1 * sin1 + a2 * sin2)

  const n2 = nr * nr + ni * ni
  const d2 = dr * dr + di * di
  const mag = d2 > 0 ? Math.sqrt(n2 / d2) : 1
  const m = Math.max(1e-12, mag)
  return 20 * Math.log10(m)
}

function filterMagDb(
  type: string,
  freqHz: number,
  cutHz: number,
  q: number,
  gainDb: number,
  sampleRate: number,
  resonance?: number,
  kParam?: number,
): number {
  if (type === 'lps' || type === 'hps' || type === 'bps' || type === 'bss' || type === 'peaks' || type === 'aps') {
    return svfMagDb(type, freqHz, cutHz, q, sampleRate)
  }
  if (type === 'lpm' || type === 'hpm') {
    return moogMagDb(type, freqHz, cutHz, q, sampleRate)
  }
  if (type === 'diodeladder') {
    return diodeLadderMagDb(freqHz, cutHz, resonance ?? q, kParam ?? 0, sampleRate)
  }
  if (type === 'lp1' || type === 'hp1') {
    return onePoleMagDb(type, freqHz, cutHz, sampleRate)
  }
  return biquadMagDb(type, freqHz, cutHz, q, gainDb, sampleRate)
}

export function hzToX(hz: number, minHz: number, maxHz: number, w: number): number {
  const a = Math.max(1, minHz)
  const b = Math.max(a + 1e-6, maxHz)
  const h = clamp(hz, a, b)
  const t = Math.log(h / a) / Math.log(b / a)
  return t * w
}

export function getFilterVizType(genName: string, variantName: string): string | null {
  if (genName === 'Biquad') {
    if (variantName === 'lp' || variantName === 'hp' || variantName === 'bp' || variantName === 'bs'
      || variantName === 'ap')
    {
      return variantName
    }
    return null
  }
  if (genName === 'Biquadshelf') {
    if (variantName === 'ls' || variantName === 'hs' || variantName === 'peak') {
      return variantName
    }
    return null
  }
  if (genName === 'Svf') {
    return variantName
  }
  if (genName === 'Onepole') {
    return variantName
  }
  if (genName === 'Moog') {
    return variantName
  }
  if (genName === 'Diodeladder') {
    return 'diodeladder'
  }
  return null
}

export { filterMagDb }
