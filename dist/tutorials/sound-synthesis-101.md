# Sound Synthesis 101

There are three main methods of sound synthesis: **additive**, **subtractive** and **FM** (Frequency Modulation). Each one tackles the same basic question from a different angle — how do you turn a simple wave into something that actually sounds interesting?

## Additive Synthesis

The idea is simple: take a bunch of pure sine waves and add them together to make something more complex. Each of those sine waves is called a *partial* or *harmonic*.

Each harmonic has a frequency that is a whole-number multiple of the fundamental — the base pitch. The more of them you stack, and the more you play with their volumes, the more character and color the sound gets.

```js
f = 110 // fundamental frequency

sine(f)*0.99 // 1st harmonic
+ sine(f*2)*0.50 // 2nd harmonic (octave)
+ sine(f*3)*0.33 // 3rd harmonic
+ sine(f*4)*0.25 // ...
+ sine(f*5)*0.20
+ sine(f*6)*0.16
+ sine(f*7)*0.14
+ sine(f*8)*0.12
+ sine(f*9)*0.11
+ sine(f*10)*0.09

|> out($*.1)
```

This produces a sawtooth wave. Tweaking the amplitudes of the harmonics will change the timbre of the sound. Try it out!

It's a precise way to build sounds, but also a lot of work. There are more efficient ways to do it. Enter **subtractive synthesis**.

## Subtractive Synthesis

Instead of building a sound up from scratch, you start with a wave that already has a lot going on — and then cut away the bits you don't want using filters.

A sawtooth wave is a great starting point. It's naturally bright and full of harmonics, which gives you a lot to work with.

```js

saw(a1) |> lp($, cutoff:500) |> out($)
```

Much easier and simpler than additive synthesis! Try tweaking the cutoff frequency to hear the effect.

This is the most common method of synthesis in electronic music. It's the foundation of classic analog synthesizers like the Moog, Roland and Korg. Sweep the filter cutoff up and the sound opens up and gets bright. Pull it down and it gets dark and muffled.

Both additive and subtractive synthesis work great for musical, pitched sounds. But a lot of sounds in the real world — bells, metal, human voices — have a rougher, less predictable quality to them. That's where **FM synthesis** shines.

## FM Synthesis

FM synthesis works by taking one oscillator (the *carrier*, which makes the sound you hear) and using a second oscillator (the *modulator*) to continuously nudge its frequency up and down. At fast enough speeds, this creates entirely new overtones — including ones that sit between the normal harmonic steps, giving the sound an edgier, more complex feel.

```js

f = 60 |> ntof($)
mi = 1.0

sine(f + sine(f)*f*mi) |> out($)
```

Try tweaking the frequency and modulation index to hear the effect. Notice how richer the sound becomes with a higher modulation index.

The modulation index (`mi`) is the key knob here. Keep it low and the sound stays pretty clean. Turn it up and things get metallic and glassy — the kind of sound that made the Yamaha DX7 famous in the 80s (those electric piano and bell patches).

This is just one example of FM. You could go crazy and modulate the modulation index with another wave, or by using an envelope.

## Envelopes

A sound that stays the same from start to finish gets boring fast. Envelopes let you change things over time — usually triggered by a note or a rhythm. Think of them as an automated hand on a knob.

The simplest kind is an **attack-decay** (`ad`) envelope: it ramps up quickly then falls back down. Let's use it to shape the volume of a sine wave.

```js

sine(a3) * ad(attack:0.001, decay:0.5, trig:every(1/2)) |> out($)
```

Notice how the sound starts sharply and then fades out. Try tweaking the attack and decay to hear the effect.

Envelopes are very powerful tools and can be used to modulate a lot of things, not just amplitude.

Let's try modulating the frequency of a sine wave with an `ad` envelope.

```js

env = ad(attack:0.001, decay:0.5, exponent:10, trig:every(1/2))

sine(c1 + 200*env) * env |> out($)
```

Yes, this is a kick drum! A quick pitch drop from high to low, plus the volume fading out — that's really all a kick drum is. FM synthesis plus envelopes is a powerful combination.

Let's use envelopes to modulate the filter cutoff of a sawtooth wave.

```js

env = ad(attack:0.0001, decay:0.5, exponent:5, trig:every(1/2))

saw(a1) * env |> lp($, cutoff:200 + 5000*env) |> out($)
```

As you can see, things are getting interesting!

## A small track

Using the techniques we have learned so far, we can create a small track.

```js
scale = 'saba'

chord = [#i, #ii, #iv, #v][t/4]

env = ad(attack:0.001, decay:0.5, exponent:10, trig:every(1/4))

sine(c1 + 200*env) * env |> out($)

trig = every(1/16)

gauss(trig) * ad(.006,.04,exponent:5,trig)*[.3,.1,.9,.2][t*4] |> hp($,8k,1) |> out($)

trig = euclid(5,8,2,bar:1/2)

env = ad(attack:0.0001, decay:0.5, exponent:5, trig)

hz=chord.markov(trig) sqr(hz*o1) * env |> lp($, cutoff:400 + 500*env) |> out($*.25)

trig = euclid(3,8,0,bar:1/2)

env = ad(attack:0.0001, decay:0.25, exponent:5, trig)

sine(hz*o5+sine(hz*o4)*hz*o3) * env |> lp($, cutoff:500 + 4000 * env)|> out($*.35)

chord.map(hz->tri(hz*o4+4*lfosine(1))) |> bp($,1800) |> out($*.3)
```

There's an FM kick, some hi-hats made from noise, a bassline hopping between chord notes, an FM lead, and a pad slowly detuning on top. A few simple ideas stacked on each other, and suddenly it feels like a track.

## Final thoughts

This was just an introduction to the basics of sound synthesis.

By combining all of the above techniques, you can create a lot of interesting sounds. Additive gives you fine control. Subtractive is fast and intuitive. FM adds grit and complexity. Envelopes make everything feel alive. Start playing, trust your ears, and see where it takes you.
