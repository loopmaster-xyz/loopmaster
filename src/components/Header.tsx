import { primaryColor } from '../state.ts'

export const Header = ({ children, class: className }: { children?: preact.ComponentChildren; class?: string }) => {
  return (
    <div
      class={`px-4 w-full h-[50px] min-h-[50px] leading-none text-white flex items-end pb-1.5 border-b-2 border-[${primaryColor.value}] ${className}`}
    >
      <div class="flex items-center justify-center gap-2">
        {children}
      </div>
    </div>
  )
}
