import { useComputed } from '@preact/signals'
import { api } from '../api.ts'
import { useAsyncMemo } from '../hooks/useAsyncMemo.ts'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import { pathname } from '../router.tsx'
import { userProjectsCount } from '../state.ts'
import { BrowseProjects } from './BrowseProjects.tsx'
import { Header } from './Header.tsx'

export const ArtistMain = () => {
  const userId = useComputed(() => pathname.value.split('/')[2] ?? '')

  const projects = useAsyncMemo(async () => {
    if (!userId.value) return []
    return await api.fetchUserProjects(userId.value)
  })

  useReactiveEffect(() => {
    userProjectsCount.value = projects.value?.length ?? 0
  }, [projects.value])

  return (
    <>
      <Header />
      <BrowseProjects projects={projects.value ?? []} />
    </>
  )
}
