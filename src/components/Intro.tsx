import { useSignal } from '@preact/signals'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import { cn } from '../lib/cn.ts'
import { busy, showIntro } from '../state.ts'
import { Logo } from './Logo.tsx'
import { RadialGradient } from './RadialGradient.tsx'
import { SpinnerLarge } from './Spinner.tsx'

export const Intro = () => {
  const fadeIn = useSignal(false)
  const zoomOut = useSignal(false)
  const zoomIn = useSignal(false)
  const fadeOut = useSignal(false)

  useReactiveEffect(() => {
    setTimeout(() => {
      fadeIn.value = true
      setTimeout(() => {
        zoomOut.value = true
      }, 200)
    }, 100)
  })

  useReactiveEffect(() => {
    if (zoomOut.value === true && !busy.value) {
      setTimeout(() => {
        if (busy.value) return
        zoomIn.value = true
        fadeOut.value = true
        setTimeout(() => {
          showIntro.value = false
        }, 1000)
      }, 100)
    }
  })

  return (
    <div
      class={cn(
        'bg-black fixed w-full h-full flex flex-col items-center justify-center z-50 transition-opacity duration-700 ease-in-out',
        fadeOut.value && 'opacity-0 pointer-events-none',
      )}
    >
      <div
        class={cn('absolute inset-0 opacity-0 transition-opacity duration-500 ease-in-out',
          fadeIn.value && 'opacity-100')}
      >
        <RadialGradient>
          <div class={cn(
            'flex flex-col items-center justify-center text-white',
            zoomIn.value
              && 'transition-all ease-in-out duration-[1000ms] scale-y-[1.15] scale-x-[1.25] -translate-y-2.5',
            !zoomOut.value && !zoomIn.value && 'opacity-0 scale-y-[1.025] scale-x-[1.1] translate-y-1',
            zoomOut.value && 'transition-all ease-in-out duration-[500ms] opacity-100',
          )}>
            <Logo text="loopmaster" size="3.5em" textShadow={true} />
            <SpinnerLarge />
          </div>
        </RadialGradient>
      </div>
    </div>
  )
}
