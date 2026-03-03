import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { batch } from '@preact/signals-core'
import { api } from '../api.ts'
import { useAsyncMemo } from '../hooks/useAsyncMemo.ts'
import { pathname } from '../router.tsx'
import { createProject, djBpm, djDocA, djDocB, djTitleA, djTitleB, type Project, projects } from '../state.ts'
import { SidebarMain } from './SidebarMain.tsx'

const ProjectButton = (
  { project, onLoadA, onLoadB }: { project: Project; onLoadA: () => void; onLoadB: () => void },
) => {
  return (
    <div
      class="group px-2 hover:bg-white/5 flex flex-row items-center justify-between gap-2 outline-none focus:bg-white/5"
      key={project.id}
    >
      {project.name}
      <div class="text-xs flex flex-row gap-1">
        <button onClick={onLoadA}
          class="flex flex-row items-center justify-center p-1 pl-0.5 pr-1.5 hover:bg-white/5 hover:text-white"
        >
          <CaretLeftIcon size={12} />
          A
        </button>
        <button onClick={onLoadB}
          class="flex flex-row items-center justify-center p-1 pl-1.5 pr-0.5 hover:bg-white/5 hover:text-white"
        >
          B
          <CaretRightIcon size={12} />
        </button>
      </div>
    </div>
  )
}

export const DJ = () => {
  const projectsList = useAsyncMemo(async () => {
    if (location.href.includes('hn')) {
      const publicProjects = await api.fetchBrowseNewest()
      const projectsList = publicProjects.map(project => {
        const p = createProject({
          serverId: project.id,
          userId: project.userId,
          id: project.id,
          name: project.name,
          isPublic: project.isPublic,
        })
        p.doc.code = p.scratch.code = project.code
        return p
      })
      batch(() => {
        djBpm.value = 144
        djDocA.value.code = projectsList[0].scratch.code
        djDocB.value.code = projectsList[1].scratch.code
        djTitleA.value = projectsList[0].name
        djTitleB.value = projectsList[1].name
      })

      return projectsList
    }
    else return projects.value
  })
  return (
    <SidebarMain>
      {projectsList.value?.map(project => (
        <ProjectButton
          key={project.id}
          project={project}
          onLoadA={() => {
            batch(() => {
              djDocA.value.code = project.scratch.code
              djTitleA.value = project.name
            })
          }}
          onLoadB={() => {
            batch(() => {
              djDocB.value.code = project.scratch.code
              djTitleB.value = project.name
            })
          }}
        />
      ))}
    </SidebarMain>
  )
}
