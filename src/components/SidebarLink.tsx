import { cn } from '../lib/cn.ts'
import { Link } from '../router.tsx'

export const SidebarLink = (
  { to, children, className, target, dataSelected = false }: {
    to: string
    className?: string
    children: preact.ComponentChildren
    target?: string
    dataSelected?: boolean
  },
) => (
  <Link
    to={to}
    class={cn(
      'group px-2 py-1 hover:bg-white/5 flex flex-row items-center justify-start gap-2 outline-none focus:bg-white/5',
      className,
    )}
    target={target}
    dataSelected={dataSelected}
  >
    {children}
  </Link>
)
