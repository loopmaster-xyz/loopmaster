import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { batch } from '@preact/signals-core'
import { djDocA, djDocB, djTitleA, djTitleB, type Project, projects } from '../state.ts'
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
  return (
    <SidebarMain>
      {projects.value.map(project => (
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
