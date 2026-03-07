# TB-303 from Scratch

The TB-303 is a classic synth that was released in 1982 by the company Roland. It is known for its unique sound and has been used by many artists to create some of the most iconic sounds in electronic music. If you've ever heard the word "acid" in a song, it's probably a reference to the sound of the TB-303 and it has been responsible for entire genres of music and the lift-off of the electronic dance music scene.

Here we will build a TB-303 from scratch using loopmaster. We will start with the basics and build up to its full sound.

## The Basics

The TB-303 is a subtractive synth. This means that it uses a filter to shape the frequency spectrum of the sound. The filter is a special low-pass filter called a "diode ladder" and is made up of a series of diodes and resistors.

As sources for the filter, it uses two kinds of oscillators, a ramp and a square.

Here's how they sound without any filters:

```js

ramp(a1) |> out($)
```


```js

sqr(a1) |> out($)
```


Quite rich in harmonics, but not very interesting yet.

Let's add the diode ladder filter to the sound. We will focus on the ramp oscillator for now as it is the most commonly used, and in the end also hear it with the square. But feel free to edit the code if you want to.

## The Filter


Here's how they sound with just the filter in the mix:

```js

ramp(a1) |> diodeladder($) |> out($)
```

The filter is subtracting some of the harmonics, making them sound a little muddier.

The effect is not there yet, so let's try tweaking a bit the filter's settings.

```js

ramp(a1) |> diodeladder($, cutoff:500, q:1, k:0, sat:1) |> out($)
```

Starting to get some character! What's next? Let's try tweaking the cutoff frequency over time using an LFO (Low Frequency Oscillator).

```js

ramp(a1) |> diodeladder($, cutoff:100+10k*lfotri(1)**3, q:.8, k:0, sat:1) |> out($)
```

The "acid" sound is starting to come through! But we can take it even further.

## The Envelope

Instead of the LFO we will use an envelope to shape the cutoff frequency over time.

```js

envelope=ad(attack:.001,decay:1,exponent:10,trig:every(1/4))

ramp(a1) |> diodeladder($, cutoff:100+10k*envelope, q:.8, k:0, sat:1) |> out($)
```

This is finally reminiscent of the TB-303! We're getting there.

We should now add a bassline melody, instead of this monotone sound, and tweak a little the settings.

```js

envelope=ad(attack:.001,decay:1,exponent:4.5,trig:every(1/8))

ramp([g1,g2,g0,b2][t*2]) |> diodeladder($, cutoff:100+1k*envelope, q:.9, k:0, sat:.9) |> out($*.5)
```

It's already really close. But there are some more details.

The TB-303 has accents and slides. We can approximate these using the `slew` function and carefully crafted values.

```js

envelope=ad(attack:.001,decay:1,exponent:4.5,trig:every(1/8))

pos=t*2
note=[g1,g2,g0,b2][pos]
accent=[.7k,21.8k,.8k,.4k, .7k,12.8k,2.8k,.4k][pos]*.5
slide=[1.8,.03,.8,.01, 1.8,.8,1.8,.03][pos]

ramp(note |> slew($,slide,.1,exp:2)) |> diodeladder($, cutoff:400+(accent |> slew($,.08,.06,3))*envelope, q:.93, k:0.0025, sat:.9) |> out($*.5)
```

See how the character became very distinct. The values in the accents and slides can change a lot the output, try changing them to see for yourself.

There is still a piece missing and that's distortion. Let's add it.

```js

envelope=ad(attack:.001,decay:1,exponent:12.5,trig:every(1/8))

pos=t*2
note=[g1,g2,g0,b2][pos]
accent=[.7k,21.8k,.8k,.4k, .7k,12.8k,2.8k,.4k][pos]*.5
slide=[1.8,.03,.8,.01, 1.8,.8,1.8,.03][pos]

ramp(note |> slew($,slide,.1,exp:2))

|> diodeladder($,
  cutoff:400+(accent |> slew($,.08,.06,3))*envelope,
  q:.93,
  k:0.0025,
  sat:.9
)
|> tanh($*25)

|> out($*.15)
```

And this is it! The full sound of the TB-303. Let's add some drums and automation and listen to it.

```js

drums() |> out($)

envelope=ad(attack:.001,decay:1,exponent:12.5,trig:every(1/8))

pos=t*2
note=[g1,g2,g0,b2][pos]
accent=[.7k,21.8k,.8k,.4k, .7k,12.8k,2.8k,.4k][pos]*.5 // <-- tweak this!
slide=[1.8,.03,.8,.01, 1.8,.8,1.8,.03][pos]

ramp(note |> slew($,slide,.1,exp:2)) // <-- try changing to sqr!

|> diodeladder($,
  cutoff:200+(accent |> slew($,.08,.06,3))*envelope

    +fractal(123,.006)**4*5k, // <-- and this!
  q:.98,
  k:0.0025,
  sat:.9
)
|> tanh($*25)

|> out($*.15)
```

There are infinite ways to take it from here. The amount of sounds you can make with the TB-303 is only limited by your imagination. Play and experiment!
