import { MouseButton } from 'utils/mouse-buttons'
import { editor, primaryColor, transport } from '../state.ts'
import { PauseGradientIcon, PlayGradientIcon, StopGradientIcon } from './Icons.tsx'

export type NavTransport = Pick<typeof transport, 'start' | 'pause' | 'stop' | 'restart'>

export const Nav = ({ transport: t = transport }: { transport?: NavTransport }) => (
  <div
    class={`absolute flex left-0 right-0 pointer-events-none items-center min-h-[50px] border-b-2 border-[${primaryColor.value}]`}
  >
    <button
      class="px-3 h-[48px] pointer-events-auto hover:bg-white/5 active:hover:scale-95 outline-none focus:bg-white/5"
      onMouseDown={e => {
        e.preventDefault()
        editor.value?.focus()
        if ((e.ctrlKey || e.metaKey) || e.button === MouseButton.Right) {
          t.restart()
        }
        else {
          t.start()
        }
      }}
    >
      <PlayGradientIcon />
    </button>
    <button
      class="px-3 h-[48px] pointer-events-auto hover:bg-white/5 active:hover:scale-95 outline-none focus:bg-white/5"
      onMouseDown={e => {
        e.preventDefault()
        editor.value?.focus()
        if ((e.ctrlKey || e.metaKey) || e.button === MouseButton.Right) {
          t.restart()
        }
        else {
          t.pause()
        }
      }}
    >
      <PauseGradientIcon />
    </button>
    <button
      class="px-3 h-[48px] pointer-events-auto hover:bg-white/5 active:hover:scale-95 outline-none focus:bg-white/5"
      onMouseDown={e => {
        e.preventDefault()
        editor.value?.focus()
        if ((e.ctrlKey || e.metaKey) || e.button === MouseButton.Right) {
          t.restart()
        }
        else {
          t.stop()
        }
      }}
    >
      <StopGradientIcon />
    </button>
  </div>
)
