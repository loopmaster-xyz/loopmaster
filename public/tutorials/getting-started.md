# Getting started

This tutorial will guide you through the basics of using loopmaster.

## A simple sine wave

A simple sine wave can be generated with the following code *(warning: loud)*:

```

sine(440) |> out($)
```

## Adding an envelope

To add an envelope we use the `ad` (attack-decay) generator and the `every` generator to trigger it.

```

sine(440)*ad(trig:every(1/8)) |> out($)
```

## Adding a melody

A melody can be added by using an array of midi notes mapping them to frequencies with the `ntof` (note-to-frequency) utility function.
We access the array here with the `t` (time) variable to get the a note based on the current time position.

```

sine([60,63,67][t] |> ntof($))*ad(trig:every(1/8)) |> out($)
```

## Making a synth

We can make a synth by defining a function. Let's make a simple FM synth.

```

fm=>sine($+sine($/4)*$)*ad(trig:every(1/8))

fm([60,63,67][t] |> ntof($)) |> out($)
```

## Adding filters

Lets add a low-pass filter with an envelope to the synth. We will use the `lp` filter.

```

fm=>sine($+sine($/2)*$)*ad(trig:every(1/8)) |> lp($,cutoff:300+10000*ad(e:40,trig:every(1/8)),q:1)

fm([60,63,67][t*2] |> ntof($)) |> out($*.5)
```

## Abstracting

We've already created a minimal function for `fm`, lets pass `trig` as an argument so we don't repeat it twice.

```

fm=(in,trig)->in|>sine($+sine($/2)*$)*ad(trig) |> lp($,cutoff:300+10000*ad(e:40,trig),q:1)

fm([60,63,67][t*2] |> ntof($), every(1/8)) |> out($*.5)
```

## Harmony

Using midi notes is not very intuitive, lets use a more musical notation. Here we define a scale and use degrees to access the notes.

```
scale='minor'

fm=(in,trig)->in|>sine($+sine($/2)*$)*ad(trig) |> lp($,cutoff:300+10000*ad(e:40,trig),q:1)

fm([#1,#3,#5][t*2]*o4, every(1/8)) |> out($*.5)
```

And now we can use roman numerals to make a chord. They translate to arrays of notes.


```
scale='minor'

progr=[#i,#i,#vi,#v]

chord=progr[t/2]

fm=(in,trig)->in|>sine($+sine($/2)*$)*ad(trig) |> lp($,cutoff:300+10000*ad(e:40,trig),q:1)

fm(chord[t*2]*o4, every(1/8)) |> out($*.5)

;(chord*o4).map(rhodes70).avg()*.8 |> out($*.5)
```

## Groove

Lets add some drums, a Euclidean trigger and a bassline. Lets also change the scale to something more interesting.


```
scale='mixolydian'

progr=[#i,#i,#vi,#v]

chord=progr[t/2]

fm=(in,trig)->in|>sine($+sine($/2)*$)*ad(trig) |> lp($,cutoff:300+10000*ad(e:40,trig),q:1)

fm(chord[t*2]*o4, euclid(3, 8, bar:1/2)) |> out($*.5)

;(chord*o4).map(rhodes70).avg()*.8 |> out($*.5)

saw(chord[0]*o2) |> lp($,chord[0]*o2,1.5)*.2 |> out($)

drums() |> out($)
```

## Mixing

Lets tighten the mix with a compressor and a limiter.


```
scale='mixolydian'

progr=[#i,#i,#vi,#v]

chord=progr[t/2]

fm=(in,trig)->in|>sine($+sine($/2)*$)*ad(trig) |> lp($,cutoff:300+10000*ad(e:40,trig),q:1)

fm(chord[t*2]*o4, euclid(3, 8, bar:1/2)) |> out($*.5)

;(chord*o4).map(rhodes70).avg()*.8 |> out($*.5)

saw(chord[0]*o2) |> lp($,chord[0]*o2,1.5)*.2 |> out($)

drums() |> out($)


mix=>compressor($,threshold:-10) |> limiter($)
```

## That's it!

You've now learned the basics of loopmaster. You can now start making your own music.
