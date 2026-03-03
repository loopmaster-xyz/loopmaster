import { controlPipeline } from 'engine/src/live/pipeline.ts'

const code = String.raw`chord=[#i,#i,#i,#ii7][t].reverse()

chord.walk(1/2)*o3 |> piano($,trig:euclid(3,8,2)) |> bus(1,$)

;(chord*o4).map(hz->piano(hz,trig:euclid(5,8,1))).avg() |> bus(1,$)

minimoog(chord[0]*o2)*ad(trig:every(1/2)) |> $+delay($,.2,.7) |> lp($,100) |> out($)`

const ccs = controlPipeline.compileSource(code)
if (ccs.errors.length) {
  console.error(ccs.errors)
  process.exit(1)
}
const sm = ccs.compile.historySourceMap || []
const out = sm.filter(e => e.genName === 'Ad' || e.genName === 'Adsr' || e.funcName === 'piano' || e.callSite)
console.log('historySourceMap len', sm.length)
for (const e of out) {
  console.log(JSON.stringify({
    pc: e.pc,
    genName: e.genName,
    line: e.line,
    column: e.column,
    callSite: e.callSite,
    funcName: e.funcName,
    inFunction: e.inFunction,
  }))
}
