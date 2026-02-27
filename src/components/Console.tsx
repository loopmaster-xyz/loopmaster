import { consoleDebug } from '../state.ts'

export const Console = () => {
  return (
    <div class="flex flex-col w-52 py-4 px-1.5 gap-0 text-neutral-400 text-xs font-mono select-none">
      {consoleDebug}
    </div>
  )
}
