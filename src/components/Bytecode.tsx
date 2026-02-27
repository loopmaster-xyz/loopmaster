import { bytecode, primaryColor } from '../state.ts'

export const Bytecode = () => {
  return (
    <div class="flex flex-col w-52 py-4 px-1.5 gap-0 text-neutral-400 text-xs font-mono whitespace-pre-wrap">
      {bytecode.value.map(line => (
        <div class="flex">
          <span style={{ color: primaryColor.value }}>{line.split(':')[0]}:&nbsp;</span>
          {line.split(': ')[1]}
        </div>
      ))}
    </div>
  )
}
