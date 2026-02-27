import { cn } from '../lib/cn.ts'
import { Link } from '../router.tsx'

export const GridItem = (
  { children, to, class: className }: { children: preact.ComponentChildren; to: string; class?: string },
) => {
  return (
    <Link
      to={to}
      target={to.startsWith('https://') ? '_blank' : undefined}
      class={cn(
        'w-30 md:h-[110px] gap-1 px-2 py-1 text-white hover:bg-white/5 flex flex-col items-center justify-center outline-none focus:bg-white/5',
        className,
      )}
    >
      {children}
    </Link>
  )
}
