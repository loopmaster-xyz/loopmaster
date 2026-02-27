import type { Projects } from '../../deno/types.ts'
import { widgetOptions } from '../state.ts'
import { BrowseProject } from './BrowseProject.tsx'
import { Main } from './Main.tsx'

export const BrowseProjects = ({ projects }: { projects: Projects }) => {
  widgetOptions.showVisuals = true
  widgetOptions.showKnobs = true
  widgetOptions.noHeader = true
  return (
    <Main key="projects" class="flex flex-col text-white/50 md:px-8 md:pl-12 py-8 gap-8">
      {projects.map(project => <BrowseProject key={project.id} project={project} />)}
    </Main>
  )
}
