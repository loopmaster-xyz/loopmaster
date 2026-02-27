import { cn } from '../lib/cn.ts'

export const Marquee = ({ children, className }: { children?: preact.JSX.Element | string; className?: string }) => {
  return (
    <span class={cn('whitespace-nowrap overflow-hidden text-ellipsis', className)}>
      {children}
    </span>
  )
}
