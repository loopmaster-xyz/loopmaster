# Sound Synthesis 101

In this tutorial you will learn how sound synthesis works — the theory behind it, and how to apply it hands-on using loopmaster. We'll cover the main synthesis methods: **additive**, **subtractive** and **FM**. By the end you'll have a solid mental model for building any sound from scratch.

## What Is Sound?

Sound is vibration. When a speaker cone moves back and forth, it pushes air molecules, creating regions of high and low pressure that travel outward as a **wave**. Our ears detect these pressure changes and our brain interprets them as sound.

The most fundamental sound is a **sine wave** — a single, pure frequency with no additional complexity:

```js

sine(hz:440) |> out($)
```

440 Hz is the note A4, the tuning reference for most Western music. The number tells you how many pressure cycles happen per second. Double it to 880 Hz and you go up one octave:

```js

sine(hz:880) |> out($)
```

Everything else in synthesis — every timbre, texture, and tone — is built from or carved out of combinations of sine waves.

## The Three Properties of Sound

Every sound has three properties you're always sculpting:

| Property | Perception | In Code |
|---|---|---|
| **Frequency** | Pitch (high/low) | `hz` argument |
| **Amplitude** | Loudness | Multiply by a number |
| **Timbre** | Tone color / character | Waveform shape, harmonics |

```js
// Lower amplitude = quieter

sine(440) * 0.3 |> out($)
```

```js
// Different waveform = different timbre

saw(440) * 0.3 |> out($)
```

## Waveforms and Harmonics

A pure sine wave contains only one frequency — its **fundamental**. Real-world sounds and most musical timbres contain many frequencies at once, called **harmonics** (or **overtones**). Harmonics are whole-number multiples of the fundamental: 2×, 3×, 4×, and so on.

The waveforms built into loopmaster each have a specific harmonic recipe:

| Waveform | Harmonics present | Character |
|---|---|---|
| `sine` | Fundamental only | Pure, smooth, flute-like |
| `tri` | Odd harmonics, falls off fast (1/n²) | Soft, hollow, oboe-like |
| `sqr` | Odd harmonics, falls off slowly (1/n) | Hollow, nasal, clarinet-like |
| `saw` | All harmonics (1/n) | Bright, buzzy, string/brass-like |

Hear each one:

```js

sine(220) |> out($)
```
```js

tri(220)  |> out($)
```
```js

sqr(220)  |> out($)
```
```js

saw(220)  |> out($)
```

Understanding this table is the key to knowing which waveform to start from: if you need a bright, harmonically rich source, start with `saw`. For something rounder, start with `tri` or `sine`.

## Additive Synthesis

**Additive synthesis** is the most literal interpretation of Fourier's theorem: *any sound can be built by adding sine waves together.* You construct a timbre by stacking individual partials at chosen frequencies, amplitudes, and phases.

### Stacking Harmonics by Hand

```js
f = 110 // fundamental

sine(f)     * 1.0   // 1st harmonic (fundamental)
+ sine(f*2) * 0.5   // 2nd harmonic (octave)
+ sine(f*3) * 0.33  // 3rd harmonic
+ sine(f*4) * 0.25  // 4th harmonic
+ sine(f*5) * 0.2   // 5th harmonic

|> out($*.3)
```

The amplitude of each harmonic follows a `1/n` curve here, which is exactly a sawtooth wave. Try giving them different amplitudes to change the character.

### Building an Organ Stop

Pipe organs work entirely by additive synthesis — each "stop" (register) mixes specific harmonics. Classic drawbar organs let you boost or cut each:

```js
f = 110

// 8' (fundamental), 4' (octave), 2⅔' (fifth above), 2' (two octaves), 1⅗' (third)
sine(f)     * 0.8
+ sine(f*2) * 0.6
+ sine(f*3) * 0.4
+ sine(f*4) * 0.5
+ sine(f*5) * 0.3

|> out($*.25)
```

### The Power and Cost of Additive Synthesis

Additive synthesis gives you complete control over every partial. The downside: to create a convincing, evolving timbre (like a real string), each partial needs its own envelope — you can end up with hundreds of oscillators. This is why most synthesis methods instead **start with a rich source and remove content**, which brings us to subtractive synthesis.

## Subtractive Synthesis

**Subtractive synthesis** is the most common method in electronic music, and the foundation of classic analog synthesis (Moog, Roland, Korg). The idea is simple:

1. Start with a harmonically **rich** source (saw, square, noise)
2. **Filter** out the frequencies you don't want
3. Shape the **amplitude** over time with an envelope

Think of it like sculpting: you start with a block of marble (the raw waveform) and chisel away until you get the shape you want.

### The Source → Filter → Envelope Chain

```js
trig = every(1/2)

saw(e3)
                          // 1. Rich source
|> lp($, cutoff:600, q:1.5)       // 2. Filter (remove highs)

|> $ * ad(0.005, 0.4, 4, trig)    // 3. Amplitude envelope

|> out($*.5)
```

Change any one of the three stages and you get a completely different sound.

### The Lowpass Filter — Your Main Tool

The lowpass filter (`lp`) is the workhorse of subtractive synthesis. It passes frequencies *below* the cutoff and attenuates everything above it.

Move the cutoff to hear the effect:

```js

saw(a2) |> lp($, cutoff:200) |> out($*.4)  // dark, muddy
```
```js

saw(a2) |> lp($, cutoff:800) |> out($*.4)  // warm, round
```
```js

saw(a2) |> lp($, cutoff:4000) |> out($*.4) // bright, present
```

The `q` (resonance) parameter adds a **boost** at the cutoff frequency. High Q values give a characteristic "wah" sound, or at extreme values, self-oscillation:

```js

saw(a2) |> lp($, cutoff:600, q:0.5) |> out($*.4) // gentle
```
```js

saw(a2) |> lp($, cutoff:600, q:3)   |> out($*.4) // resonant peak
```
```js

saw(a2) |> lp($, cutoff:600, q:8)   |> out($*.4) // screaming
```

### Filter Types

Beyond lowpass, each filter type carves a different shape out of the spectrum:

```js

saw(a3) |> lp($, 800, 2) |> out($)   // lowpass:  keep lows
```
```js

saw(a3) |> hp($, 800, 2) |> out($)   // highpass: keep highs
```
```js

saw(a3) |> bp($, 800, 4) |> out($)   // bandpass: keep a band
```
```js

saw(a3) |> bs($, 800, 2) |> out($)   // bandstop: notch out a band
```

### Envelope-Controlled Filter Sweeps

The classic subtractive sound uses an envelope to sweep the filter cutoff over time. This creates that characteristic "vowel" opening sound:

```js
trig = every(1/2)

env  = ad(0.005, 0.5, 6, trig)

saw(e2)

|> lp($, cutoff: 150 + 3000 * env, q: 2)
|> $ * env

|> out($*.5)
```

The filter starts dark, blossoms open with the attack, then closes as it decays — all in sync with the amplitude envelope.

### A Subtractive Pad

```js
trig = every(4)

// Detune two saws slightly for thickness
src = saw(c3) + saw(c3 * 1.007)

src

|> lp($, cutoff: 300 + 1200 * ad(0.8, 3, 2, trig), q: 1.2)

|> $ * ad(0.8, 3, 2, trig)

|> dattorro($, room: 0.9, damp: 0.5)

|> out($*.3)
```

## Envelopes — Shaping Sound Over Time

An envelope is a time-varying curve from 0 to 1 used to control any parameter — amplitude, filter cutoff, pitch, anything.

### AD: Attack-Decay

The simplest shape. Rise to peak, then fall.

```js
trig = every(1/2)

sine(a3) * ad(attack:0.001, decay:0.3, trig) |> out($*.5)
```

The `exponent` parameter bends the curve. Values above 1 give a convex (more percussive) shape; values below 1 give a concave (slower) shape:

```js

sine(a3) * ad(0.001, 0.4, exponent:1,  trig:every(1/2)) |> out($*.5) // linear
```
```js

sine(a3) * ad(0.001, 0.4, exponent:10, trig:every(1/2)) |> out($*.5) // snappy
```
```js

sine(a3) * ad(0.001, 0.4, exponent:50, trig:every(1/2)) |> out($*.5) // ultra-percussive
```

### ADSR: Attack-Decay-Sustain-Release

Used for sounds that hold as long as a key is pressed (sustained notes):

```js

sine(c4) * adsr(
  attack:  0.05,
  decay:   0.1,
  sustain: 0.3,
  release: 0.8,
  trig: sustain(1, every(2)) // sustain for 1 second

) |> out($*.5)
```

- **Attack**: time to reach peak
- **Decay**: time to fall from peak to sustain level
- **Sustain**: level held while the note is active (0–1)
- **Release**: time to fall from sustain to silence after note-off

### Envelopes as Modulators

Envelopes aren't just for amplitude. They can modulate anything:

```js
trig = every(1/2)

env  = ad(0.001, 0.25, 8, trig)

// Envelope modulates pitch (like a kick drum's pitch sweep)

sine(80 + 200 * env, trig) * env |> out($*.5)
```

```js
trig = every(1/2)

env  = ad(0.005, 0.5, 4, trig)

// Envelope modulates filter

saw(e2) |> lp($, 100 + 4000 * env, 2) |> $ * env |> out($*.4)
```

## FM Synthesis — Frequency Modulation

**FM synthesis** (Frequency Modulation) was popularized by the Yamaha DX7 in the 1980s and is responsible for electric pianos, bells, bass slaps, and countless classic digital sounds.

The idea: instead of filtering a rich waveform, you **modulate the frequency of one oscillator (the carrier) with another oscillator (the modulator)**. This creates complex sidebands (extra frequencies) without a single filter.

### The Basic FM Formula

```
carrier = 100
modulator = 100
index = 100

sine(carrier + sine(modulator) * index) |> out($)
```

The **modulation index** controls how much the modulator affects the carrier — higher values create more sidebands and a richer, more complex spectrum:

```js
hz = 220

// Low index: subtle, slightly electric

sine(hz + 50  * sine(hz*2)) |> out($*.3)
```
```js
// Medium index: metallic character

sine(hz + 300 * sine(hz*2)) |> out($*.3)
```
```js
// High index: harsh, clangorous

sine(hz + 2000 * sine(hz*2)) |> out($*.3)
```

### Modulator/Carrier Ratios

The ratio between modulator and carrier frequency determines whether the result sounds **harmonic** (pitched) or **inharmonic** (bell-like, metallic, percussive):

```js

hz = 220 sine(hz + 500 * sine(hz * 1)) |> out($*.3) // harmonic (octave)
```
```js

hz = 220 sine(hz + 500 * sine(hz * 2)) |> out($*.3) // harmonic (octave)
```
```js

hz = 220 sine(hz + 500 * sine(hz * 1.5)) |> out($*.3) // inharmonic (bell-like)
```
```js

hz = 220 sine(hz + 500 * sine(hz * 3.14)) |> out($*.3) // inharmonic (metallic)
```

**Rule of thumb:** integer ratios → musical/harmonic; non-integer ratios → metallic/bell/percussive.

### Enveloped FM — The DX7 Sound

The classic FM electric piano uses an envelope on the modulation index so it starts bright and decays to a purer tone:

```js
trig = every(1/2)

env  = ad(0.001, 0.8, 6, trig)

hz   = c4
modIndex = hz * 3 * env  // bright attack, pure decay

sine(hz + modIndex * sine(hz*2), trig) * env |> out($*.5)
```

### FM for Percussion

FM synthesis excels at metallic and percussive sounds. Here's a kick drum from pure FM:

```js
trig = every(1/4)

pitchEnv = ad(0.001, 0.4, 200, trig)

ampEnv   = ad(0.001, 0.5, 15,  trig)

sine(55 + 4000 * pitchEnv + 200 * sine(110 * 2.1), trig) * ampEnv |> out($*.6)
```

And a metallic percussion hit:

```js
trig = tram('x--x-x--', 1/2)

env  = ad(0.001, 0.15, 20, trig)

sine(800 + 1200 * sine(800 * 3.14) * env, trig) * env |> out($*.4)
```

## Noise and its Uses

Noise is a signal that contains many or all frequencies at once, with no pitch. It's essential for building drums, wind, breath, and textural sounds.

### Types of Noise

```js

white(seed:1) |> out($*.1) // white: equal energy at all frequencies — harsh, bright
```
```js

pink(seed:1)  |> out($*.2) // pink: 1/f, less high content — natural, balanced
```
```js
brown(seed:1) |> out($*.3) // brown: 1/f², heavy bass — rumble, wind
```
```js

gauss(seed:1) |> out($*.1) // gaussian: normally distributed — smoother white
```

### Filtered Noise as an Instrument

Because noise contains all frequencies, filtering it produces a pitched or tonal result:

```js
trig = tram('x-x--x-x', 1/2)

env  = ad(0.001, 0.12, 8, trig)

// Bandpass-filtered noise: sounds like a hi-hat or shaker

white(seed:42, trig) |> bp($, 8000, 6) |> $ * env |> out($*.4)
```

```js
trig = every(1/2)

env  = ad(0.001, 0.5, 3, trig)

// Resonant noise: pitched whistle-like tone

white(seed:7, trig) |> bp($, 600, 20) |> $ * env |> out($*.5)
```

### Building a Snare From Scratch

A snare is a mix of pitched tone (the drum head) and filtered noise (the snare wires rattling):

```js
trig = tram('-x', 1/2)

env  = ad(0.0005, 0.15, 6, trig)

// Drum head

tone  = sine(180, trig) * ad(0.0005, 0.06, 8, trig) * 0.5

// Snare wires

wires = white(seed:33, trig) |> hp($, 2000, 0.8) |> bp($, 5000, 1.5)
wires = wires * env

;(tone + wires) * 0.7 |> out($)
```

## Quick Reference: Which Method for Which Sound?

| Sound | Best starting method |
|---|---|
| Bass, leads, brass, strings | **Subtractive** (saw → filter) |
| Organs, choirs, pads with partial control | **Additive** |
| Electric pianos, bells, metallic percussion | **FM** |
| Kick, snare, hi-hats | **Subtractive** (noise + tone) |
| Wind, breath, texture | **Filtered noise** |
| Complex evolving pads | **FM + subtractive** combined |
| Realistic instruments | **Sample-based** |
