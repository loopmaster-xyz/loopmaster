# Drum One-Liners

Drum one-liners are a quick way to make drums with loopmaster.

## Kick

```

trig=tram('x-x-x-x-') sine(52+100k*ad(.0009,.012,500,trig),trig)*ad(.0014,.5,8,trig) |> out($)
```

## Hihats

### Open

```

trig=tram('-x',1/4) gauss(98,trig)*ad(.006,.32,4,trig) |> hps($,12k,.75) |> out($)
```

### Closed

```

trig=tram('xx-X',1/4) gauss(5,trig)*ad(.001,.09,4,trig) |> hps($,12k,.75)*.1 |> out($)
```

## Rimshot

```

trig=tram('---x',1/2) ;(white(11,trig)+tri(#3*o2)*1)*ad(.001,.24,28,trig)*.9 |> bps($,1.8k,.5) |> out($)
```

## Snare

```

trig=tram('---x',1/2) ;(white(17,trig)+tri(#3*o2,trig)*1)*ad(.001,.5,28,trig) |> bps($,.6k,.9) |> bps($,1.4k,.75) |> bps($,7k,.7) |> clamp($*100,-1,.1)*.2 |> out($)
```

## Bongo

```

trig=tram('-x-x-x-[xxx]') sine([180,300,500].random(every(1/16)))*ad(.001,.02,trig)*.3 |> out($)
```

## All together

```
bpm=144 transpose=-3

trig=tram('x-x-x-x-') sine(#1*o2+100k*ad(.0009,.012,500,trig),trig)*ad(.0014,.5,8,trig) |> out($)

trig=tram('-x',1/4) gauss(98,trig)*ad(.006,.32,4,trig) |> hps($,12k,.75) |> out($)

trig=tram('xx-X',1/4) gauss(5,trig)*ad(.001,.09,4,trig) |> hps($,12k,.75)*.1 |> out($)

trig=tram('-x--',1/2) ;(white(11,trig)+tri(#3*o2)*1)*ad(.001,.24,28,trig)*.9 |> bps($,1.8k,.5) |> out($)

trig=tram('---x',1/2) ;(white(17,trig)+tri(#3*o2,trig)*1)*ad(.001,.5,28,trig) |> bps($,.6k,.9) |> bps($,1.4k,.75) |> bps($,7k,.7) |> clamp($*100,-1,.1)*.2 |> out($)

trig=tram('-x-x-x-[xxx]') sine([180,300,500].random(every(1/16)))*ad(.001,.02,trig)*.3 |> out($)
```
