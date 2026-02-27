import { cn } from '../lib/cn.ts'

export const SidebarMain = ({ children, class: className }: { children: preact.ComponentChildren; class?: string }) => {
  return (
    <div class={cn('flex flex-col w-52 py-2.5 text-neutral-400 text-sm select-none', className)}>
      {children}
    </div>
  )
}
