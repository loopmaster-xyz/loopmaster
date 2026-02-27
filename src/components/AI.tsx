import { api } from '../api.ts'
import { aiModel, aiPromptNew, aiTemperature, aiTopP, createProject, primaryColor, projects } from '../state.ts'
import { SidebarButton } from './SidebarButton.tsx'
import { SidebarMain } from './SidebarMain.tsx'

const models = [
  'gpt-5.2-chat-latest',
  'gpt-5-chat-latest',
  'codex-mini-latest',
  'gpt-5-nano',
  'gpt-5-mini',
  'gpt-5.1-mini',
]

export const AI = () => {
  return (
    <SidebarMain>
      <div class="py-1 px-2 w-full text-sm flex flex-row items-center justify-between gap-2">
        <div class="whitespace-nowrap mr-1.5">
          Temp
        </div>
        <input type="range" min="0" max="2" step={0.1} value={aiTemperature.value} onChange={e => {
          aiTemperature.value = Number((e.target as HTMLInputElement).valueAsNumber.toFixed(1))
        }} class="w-full h-1 my-2" style={{
          accentColor: primaryColor.value,
        }} />
        <div class="w-[40px] text-right">{aiTemperature.value.toFixed(1)}</div>
      </div>
      <div class="py-1 px-2 w-full text-sm flex flex-row items-center justify-between gap-2">
        <div class="whitespace-nowrap mr-1.5">
          Top P
        </div>
        <input type="range" min="0" max="1" step={0.1} value={aiTopP.value} onChange={e => {
          aiTopP.value = Number((e.target as HTMLInputElement).valueAsNumber.toFixed(1))
        }} class="w-full h-1 my-2" style={{
          accentColor: primaryColor.value,
        }} />
        <div class="w-[40px] text-right">{aiTopP.value.toFixed(1)}</div>
      </div>
      <SidebarButton onClick={() => {
        aiModel.value = models[(models.indexOf(aiModel.value) + 1) % models.length] || models[0]
      }}>
        {aiModel}
      </SidebarButton>
      <div class="py-1 px-2 w-full text-sm flex flex-col gap-2">
        <SidebarButton onClick={() => {
          api.generateAITrack(aiPromptNew.value, aiTemperature.value, aiTopP.value, aiModel.value).then(p => {
            if (p) {
              const newProject = createProject({ name: p.title })
              newProject.doc.code = newProject.scratch.code = p.code
              projects.value = [...projects.value, newProject]
            }
          })
            .catch(error => {
              console.error(error)
            })
        }}>
          Generate New Track
        </SidebarButton>
        <textarea value={aiPromptNew.value} class="bg-white/5 text-white outline-none px-2 py-1" rows={3}
          onChange={e => {
            aiPromptNew.value = (e.target as HTMLTextAreaElement).value
          }} />
      </div>
    </SidebarMain>
  )
}
