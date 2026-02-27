export const sine = [
  `melody=[60,63,69].map(ntof)

sine(melody[t])*ad(trig:every(1/8)) |> out($)`,
  `melody=[60,63,69].map(ntof)

sine(melody[t])*ad(trig:every(1/16))*ad(trig:every(1/16)) |> out($)`,
]

export const slicer = [
  `hihats=()->{
  sample=freesound(274511)



  slicer(sample,slice:1-(sine(.4*co)*.5+.5),speed:1,threshold:.008,trig:every(1/16))
}


hihats() |> out($)
`,
]
