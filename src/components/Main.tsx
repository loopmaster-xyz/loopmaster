import { cn } from '../lib/cn.ts'

export const Main = ({ children, class: className }: { children?: preact.ComponentChildren; class?: string }) => {
  return (
    <div
      class={cn('text-white/50 h-[calc(100dvh-50px)] overflow-y-scroll max-h-[calc(100dvh-50px)]', className)}
    >
      {children}
    </div>
  )
}
