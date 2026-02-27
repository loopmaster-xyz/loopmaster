import { luminate } from 'utils/rgb'
import { backgroundColor, textColor } from '../state.ts'

export function RadialGradient({ children }: { children?: preact.ComponentChildren }) {
  return (
    <div className="flex flex-row gap-2 w-full h-full relative items-center justify-center"
      style={{ background: `radial-gradient(circle, ${luminate(backgroundColor.value, 0.08)} 0%, #000 100%)` }}
    >
      {children}
    </div>
  )
}
