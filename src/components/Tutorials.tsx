import { CodeIcon, HouseIcon, LightbulbFilamentIcon } from '@phosphor-icons/react'
import { useComputed } from '@preact/signals'
import { cn } from '../lib/cn.ts'
import { pathname } from '../router.tsx'
import { SidebarLink } from './SidebarLink.tsx'
import { SidebarMain } from './SidebarMain.tsx'

export const tutorials: { name: string; description: string; href: string; Icon: typeof LightbulbFilamentIcon }[] = [
  {
    name: 'Getting Started',
    description: 'Learn the basics of loopmaster',
    href: '/tutorials/getting-started',
    Icon: LightbulbFilamentIcon,
  },
  {
    name: 'Drum One-Liners',
    description: 'Learn how to make drums with one-liners',
    href: '/tutorials/drum-one-liners',
    Icon: CodeIcon,
  },
  {
    name: 'Making a House Loop',
    description: 'Learn how to make a house loop',
    href: '/tutorials/making-a-house-loop',
    Icon: HouseIcon,
  },
]

export const Tutorials = () => {
  const tutorialName = useComputed(() => pathname.value.split('/')[2])
  return (
    <SidebarMain>
      {tutorials.map(tutorial => (
        <SidebarLink to={tutorial.href}
          className={cn({ 'text-white bg-white/5': tutorialName.value === tutorial.href })}
        >
          <tutorial.Icon size={16} />
          {tutorial.name}
        </SidebarLink>
      ))}
    </SidebarMain>
  )
}
