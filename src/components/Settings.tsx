import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { entries } from 'utils/object'
import { settings } from '../settings.ts'
import { session, sidebarTab, themeName, toggleAnalyserType } from '../state.ts'
import { SidebarButton } from './SidebarButton.tsx'
import { SidebarMain } from './SidebarMain.tsx'
import Switch from './Switch.tsx'

const SettingsMap = {
  debug: { name: 'Debug', shortcut: '' },
  showVisuals: { name: 'Show Visuals', shortcut: 'alt+i' },
  showKnobs: { name: 'Show Knobs', shortcut: 'alt+k' },
  showDocs: { name: 'Show Docs', shortcut: 'alt+o' },
  wordWrap: { name: 'Word Wrap', shortcut: 'alt+p' },
} as const

const SettingsButton = ({ onClick, children }: { onClick: () => void; children: preact.ComponentChildren }) => (
  <SidebarButton onClick={onClick} class="justify-between">
    {children}
  </SidebarButton>
)

export const Settings = () => {
  return (
    <SidebarMain>
      <div class="px-2 flex flex-row items-center justify-between">
        <span>Audio Latency</span>
        <div class="flex flex-row items-center gap-1">
          <button class="hover:bg-white/5 py-1 px-1" onMouseDown={() => {
            const dec = () => settings.audioLatency = Math.max(0.005, settings.audioLatency - 0.005)
            let iv: ReturnType<typeof setInterval> | null = null
            let timeout = setTimeout(() => {
              iv = setInterval(dec, 5)
            }, 300)
            dec()
            window.addEventListener('mouseup', () => {
              if (iv) clearInterval(iv)
              if (timeout) clearTimeout(timeout)
            }, { once: true })
          }}>
            <CaretLeftIcon />
          </button>
          <span class="font-[Liga_Space_Mono] text-xs">{settings.audioLatency.toFixed(3)}</span>
          <button class="hover:bg-white/5 py-1 px-1" onMouseDown={() => {
            const inc = () => settings.audioLatency = Math.min(1, settings.audioLatency + 0.005)
            let iv: ReturnType<typeof setInterval> | null = null
            let timeout = setTimeout(() => {
              iv = setInterval(inc, 5)
            }, 300)
            inc()
            window.addEventListener('mouseup', () => {
              if (iv) clearInterval(iv)
              if (timeout) clearTimeout(timeout)
            }, { once: true })
          }}>
            <CaretRightIcon />
          </button>
        </div>
      </div>
      <div class="flex flex-col">
        {entries(SettingsMap).filter(([key]) => session.value?.isAdmin || key !== 'debug').map(([key, value]) => (
          <div class="px-2 py-1 group hover:bg-white/5 flex flex-row items-center justify-between gap-2 cursor-pointer"
            key={key} onPointerDown={() =>
            settings[key] = !settings[key]}
          >
            <span>{value.name}</span>
            <div class="flex flex-row items-center gap-2">
              <div class="text-neutral-500 text-xs">
                <kbd class="font-[Outfit]">{value.shortcut}</kbd>
              </div>
              <Switch checked={settings[key]} onChange={v => settings[key] = v} />
            </div>
          </div>
        ))}
      </div>
      <SettingsButton onClick={toggleAnalyserType}>
        <span class="whitespace-nowrap">Analyser</span>
        <div class="flex flex-row items-center gap-2">
          <div class="text-neutral-500 text-xs">
            <kbd class="font-[Outfit]">alt+l</kbd>
          </div>
          <span class="group-hover:text-white">{settings.analyserType}</span>
        </div>
      </SettingsButton>
      <SettingsButton onClick={() => sidebarTab.value = 'themes'}>
        <span>Theme</span>
        <span class="group-hover:text-white">{themeName}</span>
      </SettingsButton>
    </SidebarMain>
  )
}
