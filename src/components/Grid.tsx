export const Grid = (
  { children, cols = 3, class: className }: { children: preact.ComponentChildren; cols?: number; class?: string },
) => {
  return (
    <div class={`grid grid-cols-${cols} gap-4 ${className}`}>
      {children}
    </div>
  )
}
