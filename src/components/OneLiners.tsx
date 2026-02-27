import { PaperPlaneRightIcon, TrashIcon } from '@phosphor-icons/react'
import { useSignal } from '@preact/signals'
import { createPersistedDoc } from 'editor'
import { useCallback, useEffect } from 'preact/hooks'
import type { OneLiner, OneLiners as OneLinersType } from '../../deno/types.ts'
import { api } from '../api.ts'
import { tokenize } from '../lib/tokenizer.ts'
import { Link } from '../router.tsx'
import { primaryColor, session } from '../state.ts'
import { InlineEditor } from './InlineEditor.tsx'
import { Main } from './Main.tsx'
import { SpinnerLarge } from './Spinner.tsx'

const oneLinerDoc = createPersistedDoc('one-liner', tokenize)

export const OneLiners = ({ oneLiners }: { oneLiners: OneLinersType }) => {
  const list = useSignal<OneLinersType>(oneLiners)

  const doc = oneLinerDoc

  useEffect(() => {
    list.value = oneLiners
  }, [oneLiners])

  useEffect(() => {
    if (!doc.code || doc.code.trim() === '') {
      doc.code = '// sine wave\n\nsine(a4) |> out($)'
    }
  }, [])

  const postOneLiner = useCallback(async () => {
    const response = await api.postBrowseOneLiner(doc.buffer.code.value)
    list.value = [response, ...list.value]
  }, [doc])

  const deleteOneLiner = async (oneLiner: OneLiner) => {
    if (!confirm('Are you sure you want to delete this one-liner?')) return
    await api.deleteBrowseOneLiner(oneLiner)
    list.value = list.value.filter(o => o.id !== oneLiner.id)
  }

  return (
    <Main key="one-liners">
      <div class="flex flex-col items-start gap-4 p-4 pl-12">
        <p>
          One-liners are short, simple code snippets that are easy to understand and help you learn to use loopmaster.
        </p>
        <p>
          Post your own one-liner here: (or <Link class="text-white" to="/docs">read the docs</Link> or{' '}
          <Link class="text-white" to="/tutorials">the tutorials</Link>)
        </p>
        <div class="w-full">
          <InlineEditor showGutter={false} doc={doc} id="one-liner" />
        </div>
        <button onClick={postOneLiner}
          class="bg-white/5 px-3 py-1 hover:bg-white/10 text-white flex items-center gap-2"
        >
          Post <PaperPlaneRightIcon size={16} />
        </button>
        <div class={`border-b-2 border-[${primaryColor.value}] w-full`} />
      </div>
      {list.value.length === 0
        ? (
          <div class="flex flex-col items-center justify-center text-white pt-16">
            <SpinnerLarge />
          </div>
        )
        : (
          <div class="flex flex-col items-start gap-4 p-4 pl-12">
            {list.value.map(oneLiner => (
              <div class="w-full flex flex-row">
                <InlineEditor showGutter={false} class="flex-1" key={oneLiner.id} code={oneLiner.code}
                  id={`one-liner-${oneLiner.id}`} persisted={false} />
                {session.value && session.value.isAdmin && (
                  <button onClick={() => deleteOneLiner(oneLiner)}>
                    <TrashIcon size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
    </Main>
  )
}
