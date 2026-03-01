import { type MarkdownNode, type MarkdownTableRowNode, parseMarkdown } from '@md-parser/parser'
import {
  ChalkboardTeacherIcon,
  CodeIcon,
  LinkIcon as LinkIconPhosphor,
} from '@phosphor-icons/react'
import { useComputed, useSignal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import { isMobile } from 'utils/is-mobile'
import { useAsyncMemo } from '../hooks/useAsyncMemo.ts'
import { useReactiveEffect } from '../hooks/useReactiveEffect.ts'
import { pathname, subsection } from '../router.tsx'
import { primaryColor, widgetOptions } from '../state.ts'
import { Grid } from './Grid.tsx'
import { GridItem } from './GridItem.tsx'
import { Header } from './Header.tsx'
import { InlineEditor } from './InlineEditor.tsx'
import { Main } from './Main.tsx'
import { tutorials } from './Tutorials.tsx'

const ZigZagBorder = ({
  color = primaryColor.value,
  angle = 45,
  period = 12,
  amplitude = 5,
  width = undefined,
  className = '',
}: {
  color?: string
  angle?: number
  period?: number
  amplitude?: number
  width?: number
  className?: string
}) => {
  period = Math.max(period, 4)
  amplitude = Math.max(amplitude, 1)

  const strokeWidth = 1.5
  const pad = strokeWidth / 2

  let nPeriods = 20
  if (width) nPeriods = Math.ceil(width / period)

  const step = period / 2
  const points: string[] = []

  for (let i = 0; i <= nPeriods; ++i) {
    const x = i * step
    const y = (i % 2 === 0 ? 0 : amplitude) + pad
    points.push(`${x},${y}`)
  }

  const svgWidth = width ?? nPeriods * step
  const svgHeight = amplitude + strokeWidth

  return (
    <svg
      width={width ? svgWidth : '100%'}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      class={className}
      style="display:block; overflow: visible; position: absolute; top:95%;"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <polyline
        points={points.join(' ')}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
    </svg>
  )
}

const compile = (node: MarkdownNode) => {
  if (node.type === 'text') return node.value
  else if (node.type === 'heading') return <Heading level={node.level} children={node.children} />
  else if (node.type === 'paragraph') return <Paragraph children={node.children} />
  else if (node.type === 'list') return <List children={node.children} />
  else if (node.type === 'listItem') return <ListItem children={node.children} />
  else if (node.type === 'link') return <Link href={node.href} children={node.children} />
  else if (node.type === 'image') return <Image src={node.src} alt={node.alt} />
  else if (node.type === 'code') return <Code value={node.value} />
  else if (node.type === 'emphasis') return <Emphasis children={node.children} />
  else if (node.type === 'strong') return <Strong children={node.children} />
  else if (node.type === 'strikeThrough') return <StrikeThrough children={node.children} />
  else if (node.type === 'inlineCode') return <InlineCode value={node.value} />
  else if (node.type === 'divider') return <Divider />
  else if (node.type === 'checkbox') return <Checkbox checked={node.checked} children={node.children} />
  else if (node.type === 'comment') return <Comment value={node.value} />
  else if (node.type === 'table') return <Table header={node.header} rows={node.rows} />
  else if (node.type === 'subscript') return <Subscript children={node.children} />
  else if (node.type === 'superscript') return <Superscript children={node.children} />
  else if (node.type === 'blockquote') return <BlockQuote children={node.children} />
  else if (node.type === 'tableRow') return <TableRow children={node.children} />
  else if (node.type === 'tableHeader') return <TableHeader children={node.children} />
  else if (node.type === 'tableData') return <TableData children={node.children} />
  else if (node.type === 'lineBreak') return <LineBreak />
}

const getHeadingId = (children: MarkdownNode[]) => {
  return children.map(child => child.type === 'text' ? child.value : '').join('-').toLowerCase().replace(/[^a-z0-9-]/g,
    '-')
}

const getHeadingText = (children: MarkdownNode[]) =>
  children.map(child => child.type === 'text' ? child.value : '').join('')

type TocEntry = { id: string; level: number; text: string }

type TocNode = TocEntry & { children: TocNode[] }

const extractHeadings = (nodes: MarkdownNode[]): TocEntry[] =>
  nodes.filter((n): n is MarkdownNode & { type: 'heading'; level: number } => n.type === 'heading')
    .map(n => ({ id: getHeadingId(n.children), level: n.level, text: getHeadingText(n.children) }))

const buildTocTree = (entries: TocEntry[]): TocNode[] => {
  const root: TocNode = { id: '', level: 0, text: '', children: [] }
  const stack: TocNode[] = [root]
  for (const e of entries) {
    while (stack.length > 1 && stack[stack.length - 1].level >= e.level)
      stack.pop()
    const node: TocNode = { ...e, children: [] }
    stack[stack.length - 1].children.push(node)
    stack.push(node)
  }
  return root.children
}

const isAncestorOf = (ancestorId: string, descendantId: string, entries: TocEntry[]): boolean => {
  const idx = entries.findIndex(e => e.id === descendantId)
  if (idx < 0) return false
  const ancIdx = entries.findIndex(e => e.id === ancestorId)
  if (ancIdx < 0 || ancIdx >= idx) return false
  const ancLevel = entries[ancIdx].level
  for (let i = ancIdx + 1; i < idx; i++) {
    if (entries[i].level <= ancLevel) return false
  }
  return true
}

const isExpanded = (nodeId: string, activeId: string, entries: TocEntry[]): boolean =>
  nodeId === activeId || isAncestorOf(nodeId, activeId, entries)

const Heading = ({ level, children }: { level: number; children: MarkdownNode[] }) => {
  const sizes = ['md', 'lg', 'md', 'md', 'sm', 'xs']
  const className = `text-${sizes[level - 1]} text-white font-bold ${
    level > 1
      ? `my-6 flex flex-row items-center gap-2 relative group ${
        level === 2
          ? `py-1 border-b-2 border-[${primaryColor.value}]`
          : ''
      }`
      : ''
  }`
  const ch = children.map(compile)
  const id = getHeadingId(children)
  const Wrapper = ({ children }: { children: preact.ComponentChildren }) => <a href={`#${id}`}>{children}</a>
  const LinkIcon = () => (
    <div class="absolute hidden pr-2 group-hover:block top-1/2 -translate-y-1/2 right-[calc(100%)]">
      <LinkIconPhosphor size={16} />
    </div>
  )
  if (level === 1) {
    return (
      <Wrapper>
        <h1 id={id} class={className}>{ch}</h1>
      </Wrapper>
    )
  }
  else if (level === 2) {
    return (
      <Wrapper>
        <h2 id={id} class={className}>
          <LinkIcon />
          {ch}
        </h2>
      </Wrapper>
    )
  }
  else if (level === 3) {
    return (
      <Wrapper>
        <h3 id={id} class={className}>
          <LinkIcon />
          {ch}
        </h3>
      </Wrapper>
    )
  }
  else if (level === 4) {
    return (
      <Wrapper>
        <h4 id={id} class={className}>
          <LinkIcon />
          {ch}
        </h4>
      </Wrapper>
    )
  }
  else if (level === 5) {
    return (
      <Wrapper>
        <h5 id={id} class={className}>
          <LinkIcon />
          {ch}
        </h5>
      </Wrapper>
    )
  }
  else if (level === 6) {
    return (
      <Wrapper>
        <h6 id={id} class={className}>
          <LinkIcon />
          {ch}
        </h6>
      </Wrapper>
    )
  }
}

const Paragraph = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <p class="my-2">{ch}</p>
}

const List = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <ul>{ch}</ul>
}

const ListItem = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <li>{ch}</li>
}

const Link = ({ href, children }: { href: string; children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <a href={href} target="_blank" rel="noopener noreferrer" class="text-white underline">{ch}</a>
}

const Image = ({ src, alt }: { src: string; alt: string }) => {
  return <img src={src} alt={alt} />
}

const Code = ({ value }: { value: string }) => {
  return <InlineEditor id={`tutorial-code-${value}`} code={value.replace(/\n$/, '')} class="mt-4 mb-10" />
}

const InlineCode = ({ value }: { value: string }) => {
  return <code class={`text-[${primaryColor.value}] font-[Liga_Space_Mono]`}>{value}</code>
}

const Emphasis = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <em>{ch}</em>
}

const Strong = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <strong>{ch}</strong>
}

const StrikeThrough = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <s>{ch}</s>
}

const Divider = () => {
  return <></>
}

const Checkbox = ({ checked, children }: { checked: boolean; children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return (
    <label>
      <input type="checkbox" checked={checked} /> {ch}
    </label>
  )
}

const Comment = ({ value }: { value: string }) => {
  return <div class="text-gray-500 text-sm">{value}</div>
}

const Table = ({ header, rows }: { header: MarkdownTableRowNode; rows: MarkdownTableRowNode[] }) => {
  const headerCh = header.children.map(compile)
  const rowsCh = rows.map(row => row.children.map(compile))
  return (
    <table>
      <thead>
        <tr>
          {headerCh}
        </tr>
      </thead>
      <tbody>{rowsCh}</tbody>
    </table>
  )
}

const Subscript = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <sub>{ch}</sub>
}

const Superscript = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <sup>{ch}</sup>
}

const BlockQuote = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <blockquote>{ch}</blockquote>
}

const TableRow = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <tr>{ch}</tr>
}

const TableHeader = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <th>{ch}</th>
}

const TableData = ({ children }: { children: MarkdownNode[] }) => {
  const ch = children.map(compile)
  return <td>{ch}</td>
}

const LineBreak = () => {
  return <br />
}

const TocItem = ({
  node,
  activeId,
  headings,
  depth,
  expanded,
}: {
  node: TocNode
  activeId: string
  headings: TocEntry[]
  depth: number
  expanded: boolean
}) => {
  const onClick = () => {
    const el = document.getElementById(node.id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const hasChildren = node.children.length > 0

  return (
    <div>
      <button
        type="button"
        class={`block w-full text-left py-1 truncate hover:text-white cursor-pointer ${
          activeId === node.id ? 'text-white font-medium' : ''
        }`}
        style={depth > 0 ? { paddingLeft: `${depth * 12}px` } : {}}
        onClick={onClick}
      >
        {node.text}
      </button>
      {hasChildren && (
        <div
          class={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div class="overflow-hidden min-h-0">
            {node.children.map(child => (
              <TocItem
                key={child.id}
                node={child}
                activeId={activeId}
                headings={headings}
                depth={depth + 1}
                expanded={isExpanded(child.id, activeId, headings)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const Toc = ({
  headings,
  activeId,
}: {
  headings: TocEntry[]
  activeId: string
}) => {
  const tree = buildTocTree(headings)

  return (
    <aside class="hidden lg:block sticky top-4 self-start shrink-0 w-48 pl-8 border-l border-white/10">
      <nav class="text-sm text-white/50">
        {tree.map(node => (
          <TocItem
            key={node.id}
            node={node}
            activeId={activeId}
            headings={headings}
            depth={0}
            expanded={isExpanded(node.id, activeId, headings)}
          />
        ))}
      </nav>
    </aside>
  )
}

export const TutorialsMain = () => {
  widgetOptions.showVisuals = true
  widgetOptions.showKnobs = true
  widgetOptions.noHeader = true

  const parsed = useSignal<MarkdownNode[] | null>(null)
  const teardown = useSignal(false)
  const activeId = useSignal('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  const headings = useComputed(() =>
    parsed.value ? extractHeadings(parsed.value.slice(1)) : []
  )

  const tutorialName = useComputed(() => pathname.value.split('/')[2])

  const tutorialMarkdown = useAsyncMemo(() =>
    tutorialName.value?.length
      ? fetch(`/tutorials/${tutorialName.value}.md`).then(res => res.text())
      : Promise.resolve(null)
  )

  const tutorial = useComputed(() => tutorials.find(tutorial => tutorial.href === pathname.value) ?? null)

  useReactiveEffect(() => {
    subsection.value = tutorial.value?.name ?? null
  })

  useReactiveEffect(() => {
    if (tutorialMarkdown.value) {
      teardown.value = true
      requestAnimationFrame(() => {
        if (tutorialMarkdown.value) {
          teardown.value = false
          parsed.value = parseMarkdown(tutorialMarkdown.value)
        }
      })
    }
    else {
      parsed.value = null
    }
  })

  useEffect(() => {
    if (!parsed.value || headings.value.length === 0) return
    const firstId = headings.value[0]?.id
    if (firstId) activeId.value = firstId
    const root = containerRef.current?.parentElement as HTMLElement | null
    if (!root) return
    const ids = headings.value.map(h => h.id)
    const update = () => {
      const rect = root.getBoundingClientRect()
      const activeLine = rect.top + rect.height * 0.15
      let bestId = ids[0]
      let bestTop = -Infinity
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= activeLine && top > bestTop) {
          bestTop = top
          bestId = id
        }
      }
      activeId.value = bestId
    }
    update()
    root.addEventListener('scroll', update, { passive: true })
    return () => root.removeEventListener('scroll', update)
  }, [parsed.value, headings.value])

  return (
    <>
      <Header>
        {parsed.value && tutorial.value && (
              <>
                <tutorial.value.Icon size="24" />
                {compile(parsed.value[0])}
              </>
            ) || (isMobile() && (
            <>
              <ChalkboardTeacherIcon weight="regular" size={24} />
              Tutorials
            </>
          ))}
      </Header>
      <Main key={tutorialName.value} class={parsed.value ? 'px-4 md:px-8 md:pl-12 py-4' : 'p-4'}>
        {teardown.value ? null : (parsed.value
          ? (
            <div ref={containerRef} class="flex gap-8 min-h-0">
              <div class="flex-1 min-w-0">
                {parsed.value.slice(1).map(compile)}
                <CodeIcon size={20} class="my-6" />
              </div>
              {headings.value.length > 0 && (
                <Toc headings={headings.value} activeId={activeId.value} />
              )}
            </div>
          )
          : (
            <Grid cols={isMobile() ? 1 : 3}>
              {tutorials.map(tutorial => (
                <GridItem to={tutorial.href}>
                  <tutorial.Icon size={24} />
                  <span class="mt-2">{tutorial.name}</span>
                  <span class="text-sm text-white/50">{tutorial.description}</span>
                </GridItem>
              ))}
            </Grid>
          ))}
      </Main>
    </>
  )
}
