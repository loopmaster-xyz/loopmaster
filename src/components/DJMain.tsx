import { djBpm, djCrossfade, djDocA, djDocB, djHeaderA, djHeaderB, djTitleA, djTitleB, djTransport,
  primaryColor } from '../state.ts'
import { Editor } from './Editor.tsx'
import { Fader } from './Fader.tsx'
import { Main } from './Main.tsx'
import { Nav } from './Nav.tsx'

export const DJMain = () => {
  return (
    <>
      <div
        class={`w-full h-[50px] min-h-[50px] z-10 leading-none text-white flex items-center border-b-2 border-[${primaryColor.value}]`}
      >
        <div class="flex flex-row w-full justify-between items-center">
          <h2 class="flex-1 font-bold text-left">A: {djTitleA.value}</h2>
          <div class="flex flex-row items-center gap-1 relative">
            <div class="h-10">
              <Fader
                className="h-10"
                faderWidth={8}
                value={djCrossfade.value}
                min={0}
                max={1}
                step={0.01}
                onChange={v => djCrossfade.value = v}
              />
            </div>
            <div class="absolute left-0 translate-x-[-100%] flex flex-row items-center gap-1 text-xs">
              <span class="opacity-70">BPM</span>
              <input
                type="number"
                min={40}
                max={240}
                step={1}
                value={djBpm.value}
                onInput={e => {
                  const el = e.currentTarget as HTMLInputElement
                  djBpm.value = Number(el.value) || 0
                }}
                class="w-16 bg-transparent px-1 py-0.5 text-xs outline-none focus:border-white"
              />
            </div>
          </div>
          <h2 class="flex-1 font-bold text-right">{djTitleB.value} :B</h2>
        </div>
      </div>
      <Main class="flex flex-row w-full">
        <div class="flex flex-col flex-1">
          <div class="relative">
            <Nav transport={djTransport} />
          </div>
          <Editor doc={djDocA} header={djHeaderA.value} />
        </div>
        <div class="flex flex-col flex-1">
          <div class="relative">
            <Nav transport={djTransport} />
          </div>
          <Editor doc={djDocB} header={djHeaderB.value} />
        </div>
      </Main>
    </>
  )
}
