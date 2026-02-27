# Making a House Loop

This tutorial will guide you through the process of making a house loop.

## The Kick

A kick drum is synthesized using a sine wave, frequency modulation and an amplitude envelope.

### Step 1: Basic Sine Wave

Start with a simple sine wave playing the note `e` at octave `1` - Warning: **loud!** (can also be inaudible at small speakers):

```

sine(hz:e1) |> out($)
```

This creates a constant tone - not very kick-like yet, but it's our foundation. Play this and you'll hear a steady low tone.

### Step 2: Adding an Envelope

Lets add an envelope to shape the amplitude over time:

```

sine(hz:e1)*ad(attack:.001,decay:.4,trig:every(1/4)) |> out($)
```

Now play this — you'll hear the tone start sharply and fade out. The `ad()` (attack-decay) envelope creates a sharp attack (0.001s) for the initial punch, then a longer release (0.4s) that gives the kick body. It's starting to sound like a kick drum, but it's still quite flat. Also, notice how it sounds different every time. That's because the phase of the oscillator isn't synced to our beats. Let's fix that.

### Step 3: Syncing the Phase to the Beat

Using the `trig` parameter we can synchronize the phase of the oscillator to the beat.

```
trig=every(1/4)

sine(hz:e1,trig)*ad(attack:.001,decay:.4,trig) |> out($)
```

### Step 4: Adding Frequency Modulation (The Punch)

Now let's add frequency modulation for a punchier kick. We'll use the amplitude envelope to modulate pitch, and make the envelope exponential for a realistic sound:

```

trig=every(1/4) envelope=ad(attack:.006,decay:8,exponent:100,trig)

sine(hz:e1+100*envelope,trig)*envelope |> out($*.5)
```

Now this really sounds like a kick!

### Step 5: Adding Filters

```

trig=every(1/4) envelope=ad(attack:.006,decay:8,exponent:100,trig)

sine(hz:e1+100*envelope,trig)*envelope |> hp($,cutoff:80,q:1) |> peak($,cutoff:400,q:.5,gain:-10) |> out($*.5)
```

Now the kick sounds cleaner and more professional! The highpass filter removes bass frequencies below 80 Hz to make room for our bass later, and the peak filter at 400 Hz removes boxiness and unnecessary frequencies.

## The Hihats

We build the hihats from basic noise, adding shaping and filtering step by step.

### Step 1: Basic Noise

Lets start with simple gaussian noise - Warning: **very loud!**:

```

gauss() |> out($*.5)
```

### Step 2: Adding an Envelope

```

trig=tram('xxXx',1/4) gauss()*ad(attack:.002,decay:.03,trig) |> out($*.5)
```

### Step 3: Adding Consistent Seed

We can add a consistent seed to the noise generator to make the hihats sound the same every time.

```

trig=tram('xxXx',1/4) gauss(seed:4343,trig)*ad(attack:.002,decay:.03,trig) |> out($*.5)
```

The seed ensures the noise sounds the same each time. Without it, each trigger produces a different random noise.

### Step 4: Adding a Filter

We'll add a highpass filter to the noise to remove low frequencies.

```

trig=tram('xxXx',1/4) gauss(seed:4343,trig)*ad(attack:.002,decay:.03,trig) |> hp($,cutoff:11k) |> out($*.5)
```

Now the hihats sound crisp and bright! The highpass filter at 11 kHz removes all low frequencies, keeping only the bright, crisp top end that characterizes hihats.

## The Snare

The process for the snare is similar to the hihats, but with a few key differences: we add a subtle pitched tone, place the hits on beats 2 and 4, and use a bandpass filter instead of a highpass — this keeps only the mid frequencies, which are characteristic of a snare drum.

```

trig=tram('-x',1/2); (gauss(seed:2,trig)+tri(hz:a2))*ad(attack:.0004,decay:.075,e:2.4,trig) |> bp($,cutoff:2000) |> out($)
```

## The Bass

### Step 1: Basic Triangle Wave

Let's create the bass starting with a simple triangle wave:

```

;[e1,a1][t] |> tri($) |> out($*.5)
```
When you play this, you'll hear a steady triangle wave bassline. Triangle waves produce a warm, rounded tone, making them ideal for classic house bass sounds.

### Step 2: Gliding the Notes

```

;[e1,a1].glide(1/2) |> tri($) |> out($*.5)
```

### Step 3: Adding a Filter

```

;[e1,a1].glide(1/2) |> tri($) |> lp($,cutoff:70,q:.9) |> out($*.5)
```

Now it sounds like deep sub-bass! The lowpass filter at 70 Hz removes all frequencies above 70 Hz, creating a pure sub-bass tone.


## The Chords

We build the chords from basic saw waves, adding layering, envelopes, and filter sweeps.

### Step 1: Basic Saw Wave

```

trig=tram('-x',1/4) saw(hz:e3)*ad(attack:.05,decay:.4,trig) |> out($*.2)
```

### Step 2: Making a Chord

```

trig=tram('-x',1/4) ;[e3,a3,c4].map(hz->saw(hz)).avg()*ad(attack:.05,decay:.4,trig) |> out($*.2)
```

### Step 3: Layering


```

trig=tram('-x',1/4) ;[e3,a3,c4].map(hz->saw(hz)+saw(hz*1.5)).avg()/2*ad(attack:.05,decay:.4,trig) |> out($*.2)
```

Now play this - the chord sounds richer! For each pitch, we create two sawtooth waves: one at the base frequency and one at 1.5x (a perfect fifth). Adding them creates a richer, more complex sound. Averaging and then dividing by 2 normalizes the amplitude since we're adding multiple oscillators and we want to keep the volume consistent.

### Step 4: Filter sweep

```

trig=tram('-x',1/4) ;[e3,a3,c4].map(hz->saw(hz)+saw(hz*1.5)).avg()/7*ad(attack:.05,decay:.4,trig)

|> lps($,cutoff:200+700*ad(attack:.01,decay:.5,trig),q:.5) |> out($)
```

Now you'll hear the classic house filter sweep! The state variable filter (lowpass) with cutoff `200+700*ad(...)` sweeps from 900 Hz to 200 Hz. The sweep is controlled by an AD envelope, creating that classic house filter sweep effect. The `q:.5` sets the resonance, giving it a slight boost at the cutoff frequency.

### Step 5: Reverb

Let's add a reverb to the chord to give it some space and depth.

```

trig=tram('-x',1/4) ;[e3,a3,c4].map(hz->saw(hz)+saw(hz*1.5)).avg()/7*ad(attack:.05,decay:.4,trig)

|> lps($,200+700*ad(attack:.01,decay:.5,trig),.5) |> $+dattorro($)*1.75 |> out($)
```

## The Complete Mix

Here's the complete loop with all elements together, and some post-processing applied:

```
bpm=128

trig=every(1/4) envelope=ad(attack:.006,decay:8,exponent:100,trig)

sine(hz:e1+100*envelope,trig)*envelope |> hp($,cutoff:80,q:1) |> peak($,cutoff:400,q:.5,gain:-10) |> out($*.5)

trig=tram('xxXx',1/4) gauss(seed:4343,trig)*ad(attack:.002,decay:.03,trig) |> hp($,cutoff:11k) |> out($*.08)

trig=tram('-x',1/2); (gauss(seed:2,trig)+tri(hz:a2))*ad(attack:.0004,decay:.075,e:2.4,trig) |> bp($,cutoff:2000) |> out($)

;[e1,a1].glide(1/2) |> tri($) |> lp($,cutoff:70,q:.9) |> out($*.3)

trig=tram('-x',1/4) ;[e3,a3,c4].map(hz->saw(hz)+saw(hz*1.5)).avg()/7*ad(attack:.05,decay:.4,trig)

|> lps($,cutoff:200+700*ad(attack:.01,decay:.5,trig),q:.5) |> $+dattorro($)*1.75 |> out($)


mix=>compressor($) |> limiter($)
```
