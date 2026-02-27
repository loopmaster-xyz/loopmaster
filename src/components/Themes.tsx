import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { useSignal } from '@preact/signals'
import { cn } from '../lib/cn.ts'
import { themeName, themeVariation } from '../state.ts'
import themes from '../themes/_all.json'
import { SidebarButton } from './SidebarButton.tsx'

const ABC = ({ hidden = false }: { hidden?: boolean }) => (
  <div class={cn('text-xs pl-2 flex flex-row flex-nowrap text-neutral-500 opacity-0', { 'opacity-100': !hidden })}>
    <button
      class={cn('w-4 h-4 border border-neutral-500', { 'bg-white/5 text-white': themeVariation.value === 'A' })}
      onClick={e => {
        e.stopPropagation()
        themeVariation.value = 'A'
      }}
    >
      A
    </button>
    <button
      class={cn('w-4 h-4 border border-neutral-500', { 'bg-white/5 text-white': themeVariation.value === 'B' })}
      onClick={e => {
        e.stopPropagation()
        themeVariation.value = 'B'
      }}
    >
      B
    </button>
    <button
      class={cn('w-4 h-4 border border-neutral-500', { 'bg-white/5 text-white': themeVariation.value === 'C' })}
      onClick={e => {
        e.stopPropagation()
        themeVariation.value = 'C'
      }}
    >
      C
    </button>
  </div>
)

export const Themes = () => {
  const randomHistory = useSignal<{ name: string; variation: 'A' | 'B' | 'C' }[]>([{
    name: themeName.value,
    variation: themeVariation.value,
  }])
  const randomHistoryIndex = useSignal<number>(0)
  return (
    <div class="flex flex-col w-52 text-neutral-400 text-sm select-none overflow-x-hidden">
      <div class="px-2 py-3.5 flex flex-col">
        <div class="flex flex-row items-center justify-between">
          <span>{themeName.value}</span>
          <ABC />
        </div>
      </div>
      <div class="flex flex-row ml-2 items-center justify-between border-t border-b border-white/5">
        Random
        <div class="flex flex-row items-center justify-between">
          <SidebarButton class={`h-8 ${randomHistoryIndex.value === 0 ? 'opacity-50 cursor-default' : ''}`}
            onClick={() => {
              if (randomHistoryIndex.value === 0) {
                return
              }
              else {
                randomHistoryIndex.value--
                const { name, variation } = randomHistory.value[randomHistoryIndex.value]
                themeName.value = name
                themeVariation.value = variation
              }
            }}
          >
            <CaretLeftIcon size={16} />
          </SidebarButton>
          <SidebarButton class="h-8" onClick={() => {
            if (randomHistoryIndex.value === randomHistory.value.length - 1) {
              const theme = themes[Math.floor(Math.random() * themes.length)]
              themeName.value = theme.name
              themeVariation.value = ['A', 'B', 'C'][Math.floor(Math.random() * 3)] as 'A' | 'B' | 'C'
              randomHistory.value.push({ name: theme.name, variation: themeVariation.value })
              randomHistoryIndex.value++
            }
            else {
              const { name, variation } = randomHistory.value[++randomHistoryIndex.value]
              themeName.value = name
              themeVariation.value = variation
            }
          }}>
            <CaretRightIcon size={16} />
          </SidebarButton>
        </div>
      </div>
      <ul class="py-2.5">
        {themes.map(theme => (
          <li
            key={theme.name}
            class={cn([
              'px-2 py-1 flex items-center justify-between cursor-pointer hover:bg-white/5',
              { 'bg-white/5 text-white': themeName.value === theme.name },
            ])}
            onClick={() => {
              themeName.value = theme.name
            }}
          >
            <span class="text-sm break-all">{theme.name}</span>
            <ABC hidden={themeName.value !== theme.name} />
          </li>
        ))}
      </ul>
    </div>
  )
}
