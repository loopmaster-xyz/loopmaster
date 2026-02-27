import { effect, signal } from '@preact/signals-core'
import { cn } from './lib/cn.ts'
import { type MainPage, mainPage, type SidebarTab, sidebarTab } from './state.ts'

export const pathname = signal(window.location.pathname)

export const title = signal('loopmaster')

export const section = signal<string | null>(null)

export const subsection = signal<string | null>(null)

effect(() => {
  document.title = `${subsection.value ? `${subsection.value} - ` : ''}${
    section.value ? `${section.value} - ` : ''
  }${title.value}`
})

export const navigate = (path: string) => {
  if (path === pathname.value) return
  history.pushState({}, '', path)
  pathname.value = path
}

export const Link = (
  props: { to: string; title?: string; style?: preact.CSSProperties; children: preact.ComponentChildren; class?: string;
    onClick?: () => void; target?: string; rel?: string; dataSelected?: boolean },
) => {
  return (
    <a
      href={props.to}
      style={props.style}
      title={props.title}
      class={cn(props.class)}
      rel={props.target === '_blank' ? 'noopener noreferrer' : props.rel}
      onClick={e => {
        if (props.to.startsWith('https://')) return
        e.preventDefault()
        props.onClick?.()
        navigate(props.to)
      }}
      target={props.target}
      data-selected={props.dataSelected ? '' : undefined}
    >
      {props.children}
    </a>
  )
}

window.addEventListener('popstate', e => {
  pathname.value = window.location.pathname
})

effect(() => {
  let side: SidebarTab = null
  let main: MainPage = 'browse'
  const p = pathname.value

  if (p.startsWith('/docs')) {
    side = 'docs'
    main = 'docs'
    section.value = 'Docs'
  }
  else if (p.startsWith('/tutorials')) {
    side = 'tutorials'
    main = 'tutorials'
    section.value = 'Tutorials'
  }
  else if (p.startsWith('/browse')) {
    side = 'browse'
    main = 'browse'
    section.value = 'Browse'
  }
  else if (p.startsWith('/admin')) {
    side = 'admin'
    main = 'admin'
    section.value = 'Admin'
  }
  else if (p.startsWith('/u/')) {
    side = 'artist'
    main = 'artist'
    section.value = 'Artist'
  }
  else if (p.startsWith('/p/')) {
    sidebarTab.value = null
    main = 'project'
    section.value = null
  }
  else if (p === '/projects') {
    side = 'projects'
    main = 'editor'
    section.value = 'Projects'
  }
  else if (p === '/help') {
    side = 'help'
    main = 'help'
    section.value = 'Help'
  }
  else if (p === '/about') {
    side = 'help'
    main = 'about'
    section.value = 'About'
  }
  else if (p === '/themes') {
    side = 'themes'
    main = mainPage.value
    section.value = 'Themes'
  }
  else if (p === '/tools') {
    side = 'tools'
    main = mainPage.value
    section.value = 'Tools'
  }
  else if (p === '/settings') {
    side = 'settings'
    main = mainPage.value
    section.value = 'Settings'
  }
  else if (p === '/account') {
    side = 'account'
    main = mainPage.value
    section.value = 'Account'
  }
  else if (p === '/export-audio') {
    side = 'export-audio'
    main = mainPage.value
    section.value = 'Export Audio'
  }
  else if (p === '/share-project') {
    side = 'share-project'
    main = mainPage.value
    section.value = 'Share Project'
  }
  else if (p === '/bytecode') {
    side = 'bytecode'
    main = mainPage.value
    section.value = 'Bytecode'
  }
  else if (p === '/console') {
    side = 'console'
    main = mainPage.value
    section.value = 'Console'
  }
  else if (p === '/ai') {
    side = 'ai'
    main = mainPage.value
    section.value = 'AI'
  }
  else if (p === '/') {
    sidebarTab.value = null
    main = null
    section.value = null
  }

  if (side) sidebarTab.value = side
  mainPage.value = main
})
