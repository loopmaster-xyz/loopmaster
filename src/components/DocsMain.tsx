import { CodeIcon, InfinityIcon } from '@phosphor-icons/react'
import { useComputed } from '@preact/signals'
import { definitions, definitionToCode, getDefinitionByDocPath, getDocPath } from '../lib/definitions.ts'
import { docs } from '../lib/docs.ts'
import * as examples from '../lib/examples.ts'
import { SignatureView } from '../lib/signature-view.tsx'
import { toPascalCase } from '../lib/to-pascal-case.ts'
import { withPeriod } from '../lib/with-period.ts'
import { withoutPeriod } from '../lib/without-period.ts'
import { Link, pathname } from '../router.tsx'
import { admin, primaryColor, widgetOptions } from '../state.ts'
import { DocsIcon } from './Docs.tsx'
import { Grid } from './Grid.tsx'
import { GridItem } from './GridItem.tsx'
import { Header } from './Header.tsx'
import { InlineEditor } from './InlineEditor.tsx'
import { Main } from './Main.tsx'

const units = {
  's': 'seconds',
}

const unitsOverride = {
  'input': 'signal',
}

const categoriesList = [...new Set([...new Set([...definitions.values()])].map(d => d.category))].sort((a, b) =>
  a.localeCompare(b)
)

const DocsGen = (
  { name, category }: { name: string; category: string },
) => {
  const def = getDefinitionByDocPath(name)
  if (!def) return null
  const params = (def.parameters ?? []).filter(p => !(def.arrayMethod && p.name === 'array'))
  return (
    <>
      <Header>
        <Link to={`/docs/${category}`} class={`flex flex-row items-center gap-2 hover:text-[${primaryColor.value}]`}>
          <DocsIcon category={category} />
          {toPascalCase(category)}:
        </Link>
        <span class="font-semibold text-white">{getDocPath(def)}</span>
      </Header>
      <Main class="px-8 pl-12 py-1 pb-8">
        <div class="flex flex-col py-6 pb-4 gap-4 items-start">
          <SignatureView code={definitionToCode(def)} class="text-md font-[Liga_Space_Mono]"
            style={{ textAlign: 'justify', textAlignLast: 'right' }} />
          <span class="text-sm text-white/50">{withPeriod(def.description.join(' '))}</span>
        </div>
        {params.length > 0 && (
          <div class="flex flex-col gap-4">
            <table class="table-auto text-sm">
              <thead>
                <tr>
                  <th class="pr-10 text-white/30 text-left">Name</th>
                  <th class="pr-10 text-white/30">Type</th>
                  <th class="pr-10 text-white/30">Default</th>
                  <th class="pr-10 text-white/30">Range</th>
                  <th class="text-white/30 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {params.map((p, i) => (
                  <tr
                    key={p.name}
                    class={i !== 0 ? 'border-t border-white/20' : `border-t-2 border-[${primaryColor.value}]`}
                  >
                    <td class="pr-10 py-1 text-white font-[Liga_Space_Mono] whitespace-nowrap">{p.name}</td>
                    <td class="pr-10 text-white/50 text-center">
                      {p.type ?? unitsOverride[p.name as keyof typeof unitsOverride]
                        ?? units[p.unit as keyof typeof units]
                        ?? p.unit ?? 'number'}
                    </td>
                    <td class="pr-10 text-white/50 text-center font-[Liga_Space_Mono] whitespace-nowrap">
                      {p.default ?? '—'}
                    </td>
                    <td class="pr-10 text-white/50 text-center font-[Liga_Space_Mono] whitespace-nowrap">
                      {(p.type === 'function' || p.type === 'callback')
                        ? '—'
                        : (p.min == null && p.max == null ? <InfinityIcon size={16} class="inline-block" /> : (
                          <>
                            {p.min ?? <InfinityIcon size={16} class="inline-block" />}..
                            {p.max ?? <InfinityIcon size={16} class="inline-block" />}
                          </>
                        ))}
                    </td>
                    <td class="text-white/50 w-[100%]">{withoutPeriod(p.description?.join(' ') ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div class="flex flex-col mt-6 gap-4">
          <div class="flex flex-col gap-4">
            {[...(examples[def.name as keyof typeof examples] ?? ['a'])].map(e => (
              <InlineEditor
                key={e}
                id={`docs-${getDocPath(def)}-${e}`}
                code={admin.editDocs ? e : docs[getDocPath(def) as keyof typeof docs] ?? ''}
                persisted={admin.editDocs}
              />
            ))}
          </div>
        </div>
        <CodeIcon size={20} class="mt-10 mb-2" />
      </Main>
    </>
  )
}

const DocsCategory = ({ category }: { category: string }) => {
  const items = [...new Set([...definitions.values()])]
    .filter(d => d.category === category)
    .sort((a, b) => getDocPath(a).localeCompare(getDocPath(b)))
  return (
    <>
      <Header>
        <DocsIcon category={category} />
        {toPascalCase(category)}
      </Header>
      <Main class="px-4 pl-8 py-4">
        <Grid>
          {items.map(def => (
            <GridItem key={getDocPath(def)} to={`/docs/${category}/${encodeURIComponent(getDocPath(def))}`}
              class="items-start justify-start h-auto px-4 py-3"
            >
              <SignatureView code={definitionToCode(def, false)} class="text-md font-[Liga_Space_Mono]"
                style={{ textAlign: 'justify', textAlignLast: 'right' }} />
              <span class="flex-1" />
              <span class="text-sm text-white/50 justify-self-end">{withPeriod(def.description.join(' '))}</span>
            </GridItem>
          ))}
        </Grid>
      </Main>
    </>
  )
}

export const DocsMain = () => {
  widgetOptions.showVisuals = true
  widgetOptions.showKnobs = true
  widgetOptions.noHeader = false

  const selectedCategory = useComputed(() => pathname.value.split('/')[2])
  const selectedGen = useComputed(() => pathname.value.split('/')[3])

  return (
    selectedCategory.value
      ? selectedGen.value
        ? <DocsGen key={selectedGen.value} name={selectedGen.value} category={selectedCategory.value} />
        : <DocsCategory category={selectedCategory.value} />
      : (
        <>
          <Header />
          <Main class="p-4">
            <Grid>
              {categoriesList.map(category => (
                <GridItem to={`/docs/${category}`}>
                  <DocsIcon category={category} />
                  {toPascalCase(category)}
                </GridItem>
              ))}
            </Grid>
          </Main>
        </>
      )
  )
}
