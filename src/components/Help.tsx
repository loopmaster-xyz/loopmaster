import {
  BookOpenIcon,
  ChalkboardTeacherIcon,
  DiscordLogoIcon,
  GithubLogoIcon,
  InfoIcon,
  MegaphoneIcon,
} from '@phosphor-icons/react'
import { mainPage } from '../state.ts'
import { SidebarLink } from './SidebarLink.tsx'
import { SidebarMain } from './SidebarMain.tsx'

export const helpItems: { name: string; url: string; Icon: typeof BookOpenIcon }[] = [
  {
    name: 'Docs',
    url: '/docs',
    Icon: BookOpenIcon,
  },
  {
    name: 'Tutorials',
    url: '/tutorials',
    Icon: ChalkboardTeacherIcon,
  },
  // {
  //   name: 'Videos',
  //   href: '/videos',
  //   Icon: VideoIcon,
  // },
  {
    name: 'Discord',
    url: 'https://discord.gg/NSWaB9dRYh',
    Icon: DiscordLogoIcon,
  },
  {
    name: 'Feedback',
    url: 'https://loopmaster.featurebase.app/',
    Icon: MegaphoneIcon,
  },
  {
    name: 'GitHub',
    url: 'https://github.com/stagas/loopmaster',
    Icon: GithubLogoIcon,
  },
  {
    name: 'About',
    url: '/about',
    Icon: InfoIcon,
  },
]

export const Help = () => {
  return (
    <SidebarMain>
      {helpItems.map(item => (
        <SidebarLink to={item.url} target={item.url.startsWith('https://') ? '_blank' : undefined}>
          <item.Icon size={16} class="group-hover:text-white" />
          <span>{item.name}</span>
        </SidebarLink>
      ))}
    </SidebarMain>
  )
}
