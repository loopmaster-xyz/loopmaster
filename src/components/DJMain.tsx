import { useState } from 'preact/hooks'
import { djDocA, djDocB, djHeaderA, djHeaderB, djTitleA, djTitleB, primaryColor } from '../state.ts'
import { Editor } from './Editor.tsx'
import { Fader } from './Fader.tsx'
import { Main } from './Main.tsx'
import { Nav } from './Nav.tsx'

export const DJMain = () => {
  const [crossfade, setCrossfade] = useState(0.5)
  return (
    <>
      <div
        class={`w-full h-[50px] min-h-[50px] z-10 leading-none text-white flex items-center border-b-2 border-[${primaryColor.value}]`}
      >
        <div class="flex flex-row w-full justify-between items-center">
          <h2 class="flex-1 font-bold text-left">A: {djTitleA.value}</h2>
          <div class="h-10">
            <Fader className="h-10" faderWidth={8} value={crossfade} min={0} max={1} step={0.01}
              onChange={setCrossfade} />
          </div>
          <h2 class="flex-1 font-bold text-right">{djTitleB.value} :B</h2>
        </div>
      </div>
      <Main class="flex flex-row w-full">
        <div class="flex flex-col flex-1">
          <div class="relative">
            <Nav />
          </div>
          <Editor doc={djDocA} header={djHeaderA.value} />
        </div>
        <div class="flex flex-col flex-1">
          <div class="relative">
            <Nav />
          </div>
          <Editor doc={djDocB} header={djHeaderB.value} />
        </div>
      </Main>
    </>
  )
}
