import {
  FadersIcon,
  MathOperationsIcon,
  MicrophoneStageIcon,
  MusicNotesIcon,
  PianoKeysIcon,
  StackSimpleIcon,
  TestTubeIcon,
  WaveSawtoothIcon,
  WavesIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import { computed, useComputed } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import { cn } from '../lib/cn.ts'
import { definitions, getDocPath } from '../lib/definitions.ts'
import { pathname, subsection } from '../router.tsx'
import { docsSearch } from '../state.ts'
import { SidebarLink } from './SidebarLink.tsx'
import { SidebarMain } from './SidebarMain.tsx'

const docsIcons: Record<string, typeof WaveSawtoothIcon> = {
  generators: WaveSawtoothIcon,
  effects: WavesIcon,
  samplers: MicrophoneStageIcon,
  filters: TestTubeIcon,
  utilities: WrenchIcon,
  sequencers: MusicNotesIcon,
  mixing: FadersIcon,
  math: MathOperationsIcon,
  synths: PianoKeysIcon,
  buffers: StackSimpleIcon,
}

export const DocsIcon = ({ category, size = 24 }: { category: string; size?: number }) => {
  const Icon = docsIcons[category] ?? WrenchIcon
  return <Icon size={size} />
}

const docItemsList = [...new Set([...definitions.values()])].map(d => ({
  docPath: getDocPath(d),
  name: d.name,
  description: d.description.join(' '),
  category: d.category,
}))
const categoriesList = [...new Set(docItemsList.map(i => i.category))].sort((a, b) => a.localeCompare(b))

const fuzzyMatch = (query: string, text: string): boolean => {
  if (!text) return false
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let i = 0
  for (let j = 0; j < t.length && i < q.length; j++) {
    if (t[j] === q[i]) i++
  }
  return i === q.length
}

const matchScore = (query: string, name: string, description: string): number => {
  const q = query.toLowerCase()
  const n = name.toLowerCase()
  const d = description.toLowerCase()
  if (!q.length) return 0
  const nameIncludes = n.includes(q) ? 4 : fuzzyMatch(q, n) ? 2 : 0
  const descIncludes = d.includes(q) ? 1 : fuzzyMatch(q, d) ? 0.5 : 0
  return nameIncludes + descIncludes
}

const filteredDocItems = computed(() => {
  const q = docsSearch.value.trim()
  if (!q.length) return docItemsList
  return docItemsList
    .filter(({ docPath, name, description }) =>
      fuzzyMatch(q, docPath) || fuzzyMatch(q, name) || fuzzyMatch(q, description)
    )
    .map(item => ({ ...item, score: matchScore(q, item.docPath, item.description) }))
    .sort((a, b) => b.score - a.score || a.docPath.localeCompare(b.docPath))
})

const DocItem = (
  { docPath, category, showIcon = false }: { docPath: string; category: string; showIcon?: boolean },
) => {
  const currentDocPath = useComputed(() => decodeURIComponent(pathname.value.split('/')[3] ?? ''))
  const selected = useComputed(() => currentDocPath.value === docPath)
  return (
    <SidebarLink to={`/docs/${category}/${encodeURIComponent(docPath)}`}
      className={cn(showIcon ? 'pl-4 h-6' : 'pl-8 h-6', {
        'text-white bg-white/5': selected.value,
      })} dataSelected={selected.value}
    >
      {showIcon && <DocsIcon category={category} size={16} />}
      {docPath}
    </SidebarLink>
  )
}

export const Docs = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const categoryName = useComputed(() => pathname.value.split('/')[2])
  const genName = useComputed(() => pathname.value.split('/')[3])
  const isSearching = useComputed(() => docsSearch.value.trim().length > 0)

  useEffect(() => {
    const scrollParent = containerRef.current?.parentElement?.parentElement
    const el = scrollParent?.querySelector<HTMLElement>('[data-selected]')
    el && requestAnimationFrame(() => el.scrollIntoView({ block: 'center' }))
  }, [])

  useReactiveEffect(() => {
    subsection.value = `${genName.value ? `${genName.value} / ` : ''}${
      categoryName.value ? `${categoryName.value.charAt(0).toUpperCase() + categoryName.value.slice(1)}` : ''
    }`
  }, [categoryName])

  return (
    <SidebarMain class="gap-3 pb-12">
      <div ref={containerRef} class="contents">
        {isSearching.value
          ? (
            <div class="flex flex-col items-stretch justify-between">
              {filteredDocItems.value.map(({ docPath, category }) => (
                <DocItem key={`${category}/${docPath}`} docPath={docPath} category={category} showIcon />
              ))}
            </div>
          )
          : (
            categoriesList.map(category => (
              <div key={category} class="flex flex-col items-stretch justify-between">
                <SidebarLink to={`/docs/${category}`} className={cn('justify-start', {
                  'text-white bg-white/5': !genName.value && categoryName.value === category,
                })} dataSelected={!genName.value && categoryName.value === category}>
                  <DocsIcon category={category} size={16} />
                  <h3 class="font-bold">{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                </SidebarLink>
                <div class="flex flex-col items-stretch justify-between">
                  {filteredDocItems.value
                    .filter(item => item.category === category)
                    .sort((a, b) => a.docPath.localeCompare(b.docPath))
                    .map(({ docPath, category }) => <DocItem key={docPath} docPath={docPath} category={category} />)}
                </div>
              </div>
            ))
          )}
      </div>
    </SidebarMain>
  )
}
