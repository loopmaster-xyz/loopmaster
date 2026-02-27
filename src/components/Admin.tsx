import { RocketLaunchIcon, UserIcon, WaveformIcon } from '@phosphor-icons/react'
import { SidebarLink } from './SidebarLink.tsx'
import { SidebarMain } from './SidebarMain.tsx'

const adminIcons: Record<string, typeof UserIcon> = {
  users: UserIcon,
  projects: WaveformIcon,
  actions: RocketLaunchIcon,
}

export const AdminIcon = ({ section, size = 24 }: { section: string; size?: number }) => {
  const Icon = adminIcons[section]
  if (!Icon) return null
  return <Icon size={size} />
}

export const Admin = () => {
  return (
    <SidebarMain>
      <SidebarLink to="/admin/users">
        <AdminIcon section="users" size={16} />
        Users
      </SidebarLink>
      <SidebarLink to="/admin/projects">
        <AdminIcon section="projects" size={16} />
        Projects
      </SidebarLink>{' '}
      <SidebarLink to="/admin/actions">
        <AdminIcon section="actions" size={16} />
        Actions
      </SidebarLink>
    </SidebarMain>
  )
}
