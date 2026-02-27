import { HeartIcon } from '@phosphor-icons/react'
import { useComputed } from '@preact/signals'
import { api } from '../api.ts'
import { useAsyncMemo } from '../hooks/useAsyncMemo.ts'
import { timeAgo } from '../lib/time-ago.ts'
import { Link, pathname } from '../router.tsx'
import { primaryColor, primaryGradientA } from '../state.ts'
import { BrowseProject } from './BrowseProject.tsx'
import { Header } from './Header.tsx'
import { Main } from './Main.tsx'
import { Minidenticon } from './Minidenticon.tsx'

export const ProjectMain = () => {
  const projectId = useComputed(() => pathname.value.startsWith('/p/') ? pathname.value.split('/')[2] ?? '' : null)

  const project = useAsyncMemo(async () => {
    if (!projectId.value) return null
    return await api.fetchProject(projectId.value)
  })

  return (
    <>
      <Header class="justify-center">
        {
          /* {false && (
          <div class="text-lg flex flex-row items-center justify-start gap-3">
            <div class="flex flex-row gap-2 items-center justify-start">
              <Link to={`/u/${project.value.userId}/${project.value.artistName}`}
                class={`inline-flex flex-row items-center gap-2 text-[${primaryColor.value}] hover:text-[${primaryGradientA.value}]`}
              >
                <Minidenticon username={project.value.userId} width={24} height={24} class="bg-white/20 rounded-full" />
                {project.value.artistName}
              </Link>{' '}
              - <Link to={`/p/${project.value.id}`} class="text-white hover:underline">{project.value.name}</Link>
              <span class="ml-1.5 text-white/50 text-xs h-5 flex items-end justify-end flex-col">
                {timeAgo(new Date(project.value.updatedAt))}
              </span>
            </div>
            <button class="group h-5 flex flex-row gap-1 text-xs items-end justify-end">
              <div class="relative -top-[1px]">
                <HeartIcon size={16} class="group-hover:opacity-0" />
                <HeartIcon size={16} weight="fill" class="absolute inset-0 opacity-0 group-hover:opacity-100" />
              </div>
              <span>{project.value.likes.length}</span>
            </button>
          </div>
        )} */
        }
      </Header>
      <Main class="flex flex-col text-white/50 px-8 pl-12 py-8 gap-8">
        {project.value && <BrowseProject project={project.value} autoHeight={true} />}
      </Main>
    </>
  )
}
