import { computed, effect, signal } from '@preact/signals'
import type { Doc } from 'editor'
import { createPersistedDoc } from 'editor/src/doc.ts'
import { MouseButton } from 'utils'
import { cn } from '../lib/cn.ts'
import { createId } from '../lib/create-id.ts'
import { tokenize } from '../lib/tokenizer.ts'
import { wallTransport } from '../state.ts'
import { Editor } from './Editor.tsx'

const alphabets = [
  // Coptic
  'ⲀⲂⲄⲆⲈⲊⲌⲎⲐⲒⲔⲘⲚⲜⲞⲠⲢⲤⲦⲨⲬⲮⲰ',
  // Runic
  'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚᛜᛞᛟ',
  // Armenian
  'ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖ',
  // Devanagari
  '०१२३४५६७८९',
  // Bengali
  '০১২৩৪৫৬৭৮৯',
  // Arabic-Indic
  '٠١٢٣٤٥٦٧٨٩',
  // Thai
  '๐๑๒๓๔๕๖๗๘๙',
]

const glyphs = alphabets.join('')

const getGlyph = (index: number) => {
  const h = (index * 26544357611) >>> 0
  return glyphs[h % glyphs.length]
}

type WallCell = {
  id: string
}

const WALL_CELLS_KEY = 'wall-of-sounds-cells'

const loadWallCells = (): WallCell[] => {
  const raw = localStorage.getItem(WALL_CELLS_KEY)
  if (!raw) return []
  const data = JSON.parse(raw)
  if (!Array.isArray(data)) return []
  return data.map((item: any) => ({ id: String(item.id) }))
}

const wallCells = signal<WallCell[]>(loadWallCells())
const editingId = signal<string | null>(null)
const playingWallIds = signal<Set<string>>(new Set())

effect(() => {
  localStorage.setItem(WALL_CELLS_KEY, JSON.stringify(wallCells.value))
})

const wallDocs = new Map<string, Doc>()

const getWallProgramId = (id: string) => `wall-sound-${id}`

const getWallDoc = (id: string): Doc => {
  let doc = wallDocs.get(id)
  if (!doc) {
    doc = createPersistedDoc(getWallProgramId(id), tokenize)
    wallDocs.set(id, doc)
  }
  return doc
}

const editorDoc = computed<Doc | null>(() => {
  const id = editingId.value
  if (!id) return null
  return getWallDoc(id)
})

export const WallOfSounds = () => {
  const cells = wallCells.value
  const n = cells.length
  const countWithPlus = n + 1
  const rows = Math.round(Math.sqrt(countWithPlus))
  const cols = Math.ceil(countWithPlus / rows)
  const total = rows * cols

  const handleTogglePlay = (cellId: string) => {
    const isPlaying = playingWallIds.value.has(cellId)
    const programId = getWallProgramId(cellId)
    const doc = getWallDoc(cellId)
    const next = new Set(playingWallIds.value)
    if (isPlaying) {
      next.delete(cellId)
      playingWallIds.value = next
      void wallTransport.stop(programId)
    }
    else {
      next.add(cellId)
      playingWallIds.value = next
      void wallTransport.start(programId, doc)
    }
  }

  const handleCreateCell = () => {
    const id = createId()
    const nextCells = [...wallCells.value, { id }]
    wallCells.value = nextCells
    editingId.value = id
    const doc = getWallDoc(id)
    const programId = getWallProgramId(id)
    const nextPlaying = new Set(playingWallIds.value)
    nextPlaying.add(id)
    playingWallIds.value = nextPlaying
    void wallTransport.start(programId, doc)
  }

  return (
    <div>
      <div
        class="grid gap-0 w-[100dvw] h-[100dvh] overflow-hidden text-white select-none"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const isSoundCell = i < n
          const cell = isSoundCell ? cells[i]! : null
          const isPlaying = isSoundCell && playingWallIds.value.has(cell!.id)
          const content = isSoundCell ? getGlyph(i) : '+'
          return (
            <button
              key={i}
              onMouseDown={e => {
                if (e.button !== MouseButton.Left) return
                if (isSoundCell && cell) {
                  handleTogglePlay(cell.id)
                }
                else {
                  handleCreateCell()
                }
              }}
              onContextMenu={event => {
                if (!isSoundCell || !cell) return
                event.preventDefault()
                editingId.value = cell.id
              }}
              class={cn('flex items-center justify-center overflow-hidden hover:bg-white/10 cursor-pointer', {
                'bg-white text-black hover:bg-white/90': isPlaying,
              })}
            >
              <svg
                class="w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  x="50%"
                  y="50%"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  font-size="40"
                  fill="currentColor"
                >
                  {content}
                </text>
              </svg>
            </button>
          )
        })}
      </div>
      {editingId.value && (
        <div
          class="absolute inset-0 w-full h-full bg-black/50 flex items-start justify-center"
          onClick={() => {
            editingId.value = null
          }}
        >
          <div
            class="w-full h-auto"
            onClick={event => {
              event.stopPropagation()
            }}
          >
            <Editor doc={editorDoc} header={null} autoHeight />
          </div>
        </div>
      )}
    </div>
  )
}
