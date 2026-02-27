import { ClockIcon, CodeIcon, FireSimpleIcon, HeartIcon, StarIcon } from '@phosphor-icons/react'
import { useComputed, useSignal } from '@preact/signals'
import type { OneLiners as OneLinersType, Projects } from '../../deno/types.ts'
import { api } from '../api.ts'
import { useAsyncMemo } from '../hooks/useAsyncMemo.ts'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import { toCamelCase } from '../lib/to-camel-case.ts'
import { toTitleCase } from '../lib/to-title-case.ts'
import { pathname } from '../router.tsx'
import { browseProjects } from '../state.ts'
import { BrowseProjects } from './BrowseProjects.tsx'
import { Header } from './Header.tsx'
import { Main } from './Main.tsx'
import { OneLiners } from './OneLiners.tsx'
import { SpinnerLarge } from './Spinner.tsx'

const icons = {
  newest: <ClockIcon size={24} />,
  popular: <StarIcon size={24} />,
  hottest: <FireSimpleIcon size={24} />,
  liked: <HeartIcon size={24} />,
  oneLiners: <CodeIcon size={24} />,
}

export const BrowseMain = () => {
  const section = useComputed(() => pathname.value.split('/')[2] ?? '')

  const browseLoading = useSignal(false)

  const projects = useAsyncMemo(async () => {
    browseLoading.value = true
    projects.value = []
    try {
      if (section.value === 'newest') return await api.fetchBrowseNewest()
      if (section.value === 'popular') return await api.fetchBrowsePopular()
      if (section.value === 'hottest') return await api.fetchBrowseHottest()
      if (section.value === 'liked') return await api.fetchBrowseLiked()
      if (section.value === 'one-liners') return await api.fetchBrowseOneLiners()
      return [] as Projects
    }
    finally {
      browseLoading.value = false
    }
  })

  useReactiveEffect(() => {
    browseProjects.value = projects.value as Projects
  })

  return (
    <>
      <Header key="header">
        {icons[toCamelCase(section.value ?? '') as keyof typeof icons]}
        <span class="text-md font-bold">{toTitleCase(section.value)}</span>
      </Header>
      {browseLoading.value
        ? (
          <Main key="spinner" class="cursor-wait text-white w-full h-full flex items-center justify-center">
            <SpinnerLarge />
          </Main>
        )
        : section.value === 'one-liners'
        ? <OneLiners oneLiners={(projects.value ?? []) as OneLinersType} />
        : <BrowseProjects projects={(projects.value ?? []) as Projects} />}
    </>
  )
}
