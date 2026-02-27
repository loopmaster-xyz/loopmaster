import {
  ArticleIcon,
  DownloadIcon,
  ShareNetworkIcon,
  TerminalIcon,
  WaveformIcon,
} from '@phosphor-icons/react'
import JSZip from 'jszip'
import { settings } from '../settings.ts'
import { type Project, projects, session, sidebarTab } from '../state.ts'
import { SidebarButton } from './SidebarButton.tsx'
import { SidebarMain } from './SidebarMain.tsx'

export const Tools = () => {
  const handleDownloadProjects = async () => {
    const zip = new JSZip()
    projects.value.forEach((project: Project) => {
      zip.file(project.name + '.lm', project.scratch.code, {
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
        unixPermissions: 0o644,
      })
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loopmaster-projects-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <SidebarMain>
      {session.value && (
        <SidebarButton onClick={() => sidebarTab.value = 'share-project'}>
          <ShareNetworkIcon size={16} class="group-hover:text-white" />
          <span>Share Project</span>
        </SidebarButton>
      )}
      <SidebarButton onClick={() => sidebarTab.value = 'export-audio'}>
        <WaveformIcon size={16} class="group-hover:text-white" />
        <span>Export Audio</span>
      </SidebarButton>
      {session.value && (
        <SidebarButton onClick={handleDownloadProjects}>
          <DownloadIcon size={16} class="group-hover:text-white" />
          <span>Download Projects</span>
        </SidebarButton>
      )}
      {(settings.debug || session.value?.isAdmin) && (
        <SidebarButton onClick={() => sidebarTab.value = 'bytecode'}>
          <ArticleIcon size={16} class="group-hover:text-white" />
          <span>Bytecode</span>
        </SidebarButton>
      )}
      {(settings.debug || session.value?.isAdmin) && (
        <SidebarButton onClick={() => sidebarTab.value = 'console'}>
          <TerminalIcon size={16} class="group-hover:text-white" />
          <span>Console</span>
        </SidebarButton>
      )}
    </SidebarMain>
  )
}
