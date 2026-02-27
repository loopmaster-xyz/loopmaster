import {
  BookOpenIcon,
  ChalkboardTeacherIcon,
  GearSixIcon,
  GlobeIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  QuestionIcon,
  UserIcon,
  UsersThreeIcon,
  WaveformIcon,
  WrenchIcon,
} from '@phosphor-icons/react'
import { cn } from '../lib/cn.ts'
import { Link } from '../router.tsx'
import { docsSearch, primaryColor, session, sidebarOpen, type SidebarTab, sidebarTab } from '../state.ts'
import { Account } from './Account.tsx'
import { Admin } from './Admin.tsx'
import { AI } from './AI.tsx'
import { Artist } from './Artist.tsx'
import { Browse } from './Browse.tsx'
import { Bytecode } from './Bytecode.tsx'
import { Console } from './Console.tsx'
import { Docs } from './Docs.tsx'
import { ExportAudio } from './ExportAudio.tsx'
import { Help } from './Help.tsx'
import { Logo } from './Logo.tsx'
import { Projects } from './Projects.tsx'
import { Settings } from './Settings.tsx'
import { ShareProject } from './ShareProject.tsx'
import { Themes } from './Themes.tsx'
import { Tools } from './Tools.tsx'
import { Tutorials } from './Tutorials.tsx'

const sidebarButtonClass =
  'select-none p-4 flex items-center justify-center hover:bg-white/5 focus:bg-white/5 outline-none text-neutral-400 text-sm'

const SidebarTabLink = (
  { icon, tab, title }: { icon: preact.JSX.Element; tab: string; title?: string },
) => (
  <Link to={tab ? `/${tab}` : '/'} title={title} class={cn(
    sidebarButtonClass,
    { 'text-white': sidebarTab.value === tab?.split('/')[0] },
  )} onClick={() => {
    const targetTab = tab?.split('/')[0] as SidebarTab
    sidebarTab.value = targetTab === sidebarTab.value ? null : targetTab
  }}>
    {icon}
  </Link>
)

const SidebarTabButton = (
  { icon, tab, title }: { icon: preact.JSX.Element; tab: SidebarTab; title?: string },
) => (
  <button class={cn(
    sidebarButtonClass,
    { 'text-white': sidebarTab.value === tab },
  )} title={title} onClick={() => {
    const targetTab = tab
    sidebarTab.value = targetTab === sidebarTab.value ? null : targetTab
  }}>
    {icon}
  </button>
)

export const Sidebar = () => (
  <div class="flex flex-row w-full h-[100dvh] overflow-hidden text-neutral-500">
    <div class="flex flex-col items-stretch justify-start h-full">
      <div class={`w-full h-[50px] leading-none flex items-end border-b-2 border-[${primaryColor.value}]`}>
        <Link to="/" class="px-2 py-1 top-[1px] relative hover:bg-white/5 focus:bg-white/5 outline-none">
          <Logo />
        </Link>
      </div>
      <SidebarTabLink icon={<WaveformIcon size={16} />} tab="projects" title="Projects" />
      <SidebarTabLink icon={<WrenchIcon size={16} />} tab="tools" title="Tools" />
      <SidebarTabButton icon={<GearSixIcon size={16} />} tab="settings" title="Settings" />
      <SidebarTabLink icon={<GlobeIcon size={16} />} tab="browse/newest" title="Browse" />
      <SidebarTabButton icon={<UserIcon size={16} />} tab="account" title="Account" />
      <SidebarTabLink icon={<BookOpenIcon size={16} />} tab="docs" title="Docs" />
      <SidebarTabLink icon={<ChalkboardTeacherIcon size={16} />} tab="tutorials" title="Tutorials" />
      <SidebarTabLink icon={<QuestionIcon size={16} />} tab="help" title="Help" />
      {session.value?.isAdmin && <SidebarTabLink icon={<MagicWandIcon size={16} />} tab="ai" title="AI" />}
      {session.value?.isAdmin && <SidebarTabLink icon={<UsersThreeIcon size={16} />} tab="admin" title="Admin" />}
      <div class="flex-1" />
    </div>
    {sidebarOpen.value && (
      <div class="flex flex-col w-full h-full max-h-[100dvh]">
        <div class={`select-none pl-2 py-1.5 w-full h-[50px] flex items-end border-b-2 border-[${primaryColor.value}]`}>
          <h2 class="text-sm font-bold w-full">
            {{
              '': '',
              'projects': 'Projects',
              'browse': 'Browse',
              'bytecode': 'Bytecode',
              'console': 'Console',
              'themes': 'Themes',
              'tools': 'Tools',
              'settings': 'Settings',
              'account': 'Account',
              'share-project': 'Share Project',
              'export-audio': 'Export Audio',
              'help': 'Help',
              'docs': (
                <div class="relative text-white">
                  <MagnifyingGlassIcon size={16}
                    class="text-neutral-400 absolute left-0 mt-0.5 top-1/2 -translate-y-1/2" />
                  <input ref={el => {
                    el?.focus()
                  }} type="text" value={docsSearch.value} onChange={e =>
                    docsSearch.value = (e.target as HTMLInputElement).value}
                    class="bg-transparent outline-none focus:bg-white/5 px-2 pl-8 py-1 -ml-2 -mb-2 placeholder:text-neutral-400"
                    placeholder="Search docs..." />
                </div>
              ),
              'tutorials': 'Tutorials',
              'admin': 'Admin',
              'artist': '',
              'ai': 'AI',
            }[sidebarTab.value ?? ''] ?? ''}
          </h2>
        </div>
        <div class="flex-1 min-h-0 flex flex-col">
          <div class="flex-1 min-h-0 overflow-y-auto">
            {sidebarTab.value === 'projects'
              ? <Projects />
              : sidebarTab.value === 'tools'
              ? <Tools />
              : sidebarTab.value === 'bytecode'
              ? <Bytecode />
              : sidebarTab.value === 'settings'
              ? <Settings />
              : sidebarTab.value === 'console'
              ? <Console />
              : sidebarTab.value === 'account'
              ? <Account />
              : sidebarTab.value === 'themes'
              ? <Themes />
              : sidebarTab.value === 'share-project'
              ? <ShareProject />
              : sidebarTab.value === 'export-audio'
              ? <ExportAudio />
              : sidebarTab.value === 'help'
              ? <Help />
              : sidebarTab.value === 'docs'
              ? <Docs />
              : sidebarTab.value === 'tutorials'
              ? <Tutorials />
              : sidebarTab.value === 'browse'
              ? <Browse />
              : sidebarTab.value === 'admin'
              ? <Admin />
              : sidebarTab.value === 'artist'
              ? <Artist />
              : sidebarTab.value === 'ai'
              ? <AI />
              : ''}
          </div>
        </div>
      </div>
    )}
  </div>
)
