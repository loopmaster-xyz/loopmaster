import {
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  FloppyDiskBackIcon,
  PencilSimpleIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react'
import { batch, useSignal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import { MouseButton } from 'utils/mouse-buttons'
import { projectsLoading } from '../api.ts'
import { cn } from '../lib/cn.ts'
import {
  backgroundColor,
  createNewProject,
  currentProject,
  currentProjectId,
  deleteProject,
  discardChanges,
  getNextUntitledName,
  isPlaying,
  playingProject,
  type Project,
  projects,
  saveProject,
  session,
  transport,
} from '../state.ts'
import { AuthForm } from './AuthForm.tsx'
import { PauseGradientIcon, PlayGradientIcon } from './Icons.tsx'
import { SidebarButton } from './SidebarButton.tsx'
import { SidebarMain } from './SidebarMain.tsx'
import { SpinnerSmall } from './Spinner.tsx'

const ProjectEditingItem = (
  { project, onSave, onCancel }: { project: Project;
    onSave: ({ name, isPublic }: { name: string; isPublic: boolean }) => void; onCancel: () => void },
) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const didSave = useSignal<boolean | null>(null)

  const localIsPublic = useSignal(project.isPublic)

  const handleAccept = () => {
    didSave.value = true
    const name = (inputRef.current?.value ?? '').trim() || getNextUntitledName()
    const isPublic = localIsPublic.value
    onSave({ name, isPublic })
  }

  const handleCancel = () => {
    if (didSave.value === null) {
      didSave.value = false
      onCancel()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAccept()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleBlur = () => {
    handleCancel()
  }

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [inputRef])

  const isCurrentProject = currentProject.value?.id === project.id

  return (
    <li class={cn(
      'flex flex-row items-center justify-between gap-0.5 pr-1 h-7',
      { 'bg-white/5 text-white': isCurrentProject },
    )}>
      <input
        ref={inputRef}
        class="w-full bg-transparent py-0 ml-2 text-white outline-none"
        type="text"
        value={project.name}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      <button title="Delete project" class="p-1 text-neutral-600 hover:text-white" onMouseDown={e => {
        e.stopPropagation()
        if (confirm('Are you sure you want to delete this project?')) {
          deleteProject(project)
        }
      }}>
        <TrashIcon size={16} />
      </button>
      <button title="Accept changes" class="p-1 text-neutral-600 hover:text-white" onMouseDown={handleAccept}>
        <CheckIcon size={16} />
      </button>
      <button title={localIsPublic.value ? 'Make project private' : 'Make project public'}
        class="p-1 text-neutral-600 hover:text-white" onMouseDown={e => {
        e.preventDefault()
        e.stopPropagation()
        localIsPublic.value = !localIsPublic.value
      }}>
        {localIsPublic.value ? <EyeIcon size={16} /> : <EyeSlashIcon size={16} />}
      </button>
    </li>
  )
}

const ProjectItem = ({ project }: { project: Project }) => {
  const isEditing = useSignal(false)
  const isPlayingProject = playingProject.value?.id === project.id
  const isCurrentProject = currentProject.value?.id === project.id
  if (isEditing.value) {
    return (
      <ProjectEditingItem
        project={project}
        onSave={({ name, isPublic }) => {
          if (project.isSaved) {
            saveProject(project, { name, isPublic }).then(() => {
              isEditing.value = false
            })
          }
          else {
            batch(() => {
              project.name = name
              project.isPublic = isPublic
              isEditing.value = false
            })
          }
        }}
        onCancel={() => {
          isEditing.value = false
        }}
      />
    )
  }

  return (
    <li
      class={cn(
        'group flex flex-row items-center justify-between gap-2 pl-0.5 py-0.5 cursor-pointer hover:bg-white/5',
        { 'bg-white/5 text-white': isCurrentProject },
      )}
      onMouseDown={e => {
        currentProjectId.value = project.id
        if ((e.ctrlKey || e.metaKey) || e.button === MouseButton.Right) {
          transport.restart()
        }
      }}
    >
      <button
        class="group relative text-neutral-700 p-1 pr-0.5"
        onMouseDown={e => {
          if (playingProject.value?.id === project.id) {
            if ((e.ctrlKey || e.metaKey) || e.button === MouseButton.Right) {
              transport.restart()
            }
            else {
              transport.pause()
            }
          }
          else {
            currentProjectId.value = project.id
            if ((e.ctrlKey || e.metaKey) || e.button === MouseButton.Right) {
              transport.restart()
            }
            else {
              transport.start()
            }
          }
        }}
      >
        {isPlayingProject && isPlaying.value
          ? (
            <>
              <span class="group-hover:opacity-0">
                <PlayGradientIcon size={16} />
              </span>
              <span class="opacity-0 absolute top-1 left-1 group-hover:opacity-100">
                <PauseGradientIcon size={16} />
              </span>
            </>
          )
          : (
            <>
              <span class="group-hover:opacity-0">
                <PlayIcon weight="fill" size={16} />
              </span>
              <span class="opacity-0 absolute top-1 left-1 group-hover:opacity-100">
                <PlayGradientIcon size={16} />
              </span>
            </>
          )}
      </button>
      <div class="flex flex-row items-start relative min-w-0 flex-1">
        <span
          className={cn('min-w-0 whitespace-nowrap overflow-hidden text-ellipsis', {
            '': !project.isDirty,
          })}
        >
          {project.name}
        </span>
      </div>
      <div class="flex flex-row items-center gap-0.5 pr-1 shrink-0">
        {project.isDirty && (
          <button
            title="Save project"
            class="p-1 text-neutral-600 hover:text-white opacity-0 absolute group-hover:opacity-100 group-hover:static"
            onMouseDown={e => {
              e.stopPropagation()
              saveProject(project)
            }}
          >
            <FloppyDiskBackIcon size={16} />
          </button>
        )}
        <button
          class="p-1 text-neutral-600 hover:text-white opacity-0 absolute group-hover:opacity-100 group-hover:static"
          onMouseDown={e => {
            e.stopPropagation()
            isEditing.value = true
          }}
        >
          <PencilSimpleIcon size={16} />
        </button>
        {!project.isPublic && (
          <button
            class="p-1 text-neutral-600 pointer-events-none group-hover:opacity-0 group-hover:absolute"
            onMouseDown={e => {
              e.stopPropagation()
              project.isPublic = !project.isPublic
            }}
          >
            <EyeSlashIcon size={16} />
          </button>
        )}
        {project.isDirty && (
          <div class="relative h-6">
            <button title="Discard changes"
              class="p-1 text-neutral-600 hover:text-white opacity-0 group-hover:opacity-100 shrink-0"
              onMouseDown={e => {
                e.stopPropagation()
                if (confirm('Are you sure you want to discard changes to this project?')) {
                  discardChanges(project)
                }
              }}
            >
              <XIcon weight="bold" size={16} />
            </button>
            <div class="absolute pointer-events-none top-[9px] left-[9px] w-1.5 h-1.5 rounded-full bg-neutral-600 group-hover:opacity-0" />
          </div>
        )}
      </div>
    </li>
  )
}

export const Projects = () => {
  return (
    <SidebarMain class="h-[calc(100dvh-50px)] overflow-x-hidden">
      <div class="relative flex flex-col justify-start">
        <SidebarButton onClick={createNewProject}>
          <PlusIcon size={16} class="group-hover:text-white" />
          New
        </SidebarButton>
        <ul class="">
          {projects.value.map(project => <ProjectItem key={project.id} project={project} />)}
        </ul>
        {projectsLoading.value && (
          <div
            class={`cursor-wait absolute top-0 left-0 w-full h-full flex items-center justify-center bg-opacity-70 bg-[${backgroundColor.value}]`}
          >
            <SpinnerSmall />
          </div>
        )}
      </div>
      <div class="flex-1" />
      {!session.value && (
        <div class="mt-4">
          <AuthForm placement="bottom" />
        </div>
      )}
    </SidebarMain>
  )
}
