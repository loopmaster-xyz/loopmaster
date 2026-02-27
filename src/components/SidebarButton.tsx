import { cn } from '../lib/cn.ts'

export const SidebarButton = (
  { children, onClick, class: className, disabled = false }: {
    class?: string
    children: preact.ComponentChildren
    onClick?: (e: preact.TargetedPointerEvent<HTMLButtonElement>) => void
    disabled?: boolean
  },
) => (
  <button
    class={cn(
      'group px-2 py-1 flex flex-row items-center gap-2 outline-none',
      { 'opacity-50 cursor-wait': disabled },
      { 'hover:bg-white/5 focus:bg-white/5': !disabled },
      className,
    )}
    onClick={onClick}
  >
    {children}
  </button>
)
