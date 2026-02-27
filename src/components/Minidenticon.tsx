import type { ImgHTMLAttributes } from 'preact'
import { useMemo } from 'preact/hooks'
import { minidenticon } from '../lib/minidenticon.ts'

interface MinidenticonProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  username: string
  saturation?: number
  lightness?: number
}

export const Minidenticon = ({ username, saturation, lightness, ...props }: MinidenticonProps) => {
  const svgText = useMemo(() => minidenticon(username, saturation, lightness), [username, saturation, lightness])
  return <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`} alt={username} {...props} />
}
