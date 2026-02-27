/**
 * Alpha-composite `top` over `bottom`.
 * `alpha` is the opacity of `top` in range [0, 1].
 * Accepts hex colors: #rgb or #rrggbb. Returns #rrggbb.
 */
export function blendHex(
  top: string,
  bottom: string,
  alpha: number,
): string {
  alpha = Math.max(0, Math.min(1, alpha))

  const parseHex = (hex: string): [number, number, number] => {
    hex = hex.replace(/^#/, '')
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('')
    }
    if (hex.length !== 6) {
      throw new Error(`Invalid hex color: ${hex}`)
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }

  const [tr, tg, tb] = parseHex(top)
  const [br, bg, bb] = parseHex(bottom)

  const blend = (t: number, b: number) => Math.round(t * alpha + b * (1 - alpha))

  const r = blend(tr, br)
  const g = blend(tg, bg)
  const b = blend(tb, bb)

  return (
    '#'
    + [r, g, b]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
  )
}
