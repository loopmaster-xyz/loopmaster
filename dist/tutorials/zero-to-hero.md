# Zero to Hero

In this tutorial you will learn everything you need to know to start making music with loopmaster. We will cover all the basics of the language and how to use it to produce music.

A bit of coding experience is helpful but not required, as well as knowledge of music theory, sound synthesis and music production. If you already know these things, don't worry, this tutorial is still for you, as you might pick up a few new tricks along the way. If, again, you are completely new to all of these, you can still follow along, but you might need to read up on some of the concepts on your own as well.

## Your First Sound

The simplest thing you can do: generate a sine wave and send it to the speakers.

```js

sine(hz:440) |> out($)
```

The sine wave is the most basic building block of sound synthesis. All sounds are combinations of sine waves.

Here, `sine(440)` makes a 440 Hertz tone. It represents the note A, if you're Anglo-saxon - or La if you're from Europe - in loopmaster we will be using the Anglo-saxon notation `C D E F G A B`.

**Hertz** is the unit of **frequency**. It is the number of **cycles** (also called **periods** or **oscillations**) per second. They transform into air pulses by the speakers that we then perceive as sound. `sine` can also be called an **oscillator**, it is because it oscillates between two values, `-1` and `1` during one period.

`|> out($)` sends it to your speakers. That `|>` is called the **pipe operator** — it takes whatever's on the left and hands it to the right as `$`. You'll use it constantly, as it is the most important operator in the language. The above could have also be written as such:

```js

out(sine(hz:440))
```

Which is exactly the same, but less readable, as you have to read it from the inside out instead from left to right.

Let's try some more oscillators:

```js

saw(440) |> out($) // sawtooth wave
```

```js

sqr(220) |> out($) // square wave
```

```js

tri(330) |> out($) // triangle wave
```

Each has a different character. Sawtooth is bright and buzzy. Square is hollow and metallic. Triangle is soft and flute-like.

See also how we omitted the `hz` label. As it is the first parameter of the oscillator functions, we don't need to specify it. More on that later.

## The Pipe Operator

`|>` is the heart of this language. To type it, it's a combination of the `|` and `>` characters. It chains operations left to right:

```js

saw(440) |> lp($) |> out($)
```

Read it: *make a sawtooth, run it through a lowpass filter, send to output*. Inside each step, `$` is "whatever came from the left."

You can chain as many operations as you want:

```js

saw(440) |> lp($) |> tube($) |> out($)
```

`tube` is soft saturation/distortion. It adds warmth and character to the sound.

## Variables

Variables hold values that we can pass around and use in our code. We assign values to them with using the `=` operator:

```js
hz = 330
vol = 0.5

sine(hz) * vol |> out($)
```

Here we use the `hz` and `vol` variables to store the frequency and volume of the sound. We then multiply the sine wave output (which is a number between `-1` and `1`) with the volume variable to get a number between `-0.5` and `0.5`, so less loud. This is a simple way to control the volume of the sound.

### Local vs Outer

This is the most important scoping rule. When you assign inside a block (function, `if`, `for`...), the runtime first looks for an existing variable with that name in any outer scope. If it finds one, it updates it. If not, it creates a new one within the current scope.

If you don't know what scope is, you should read this first: [What is Scope?](https://www.w3schools.com/programming/prog_scope.php).

```js
x = 10

changeOuterX = () -> {
  x = 42 // finds outer x and updates it
}

print(x)

changeOuterX()

print(x) // updated outer x
```

In order to create a variable inside the function with the same name as the outer one, but being a **local** and not affecting the outer one, we can use the `:=` operator. This way, the local variables is said to **shadow** the outer one.

```js
x = 10

dontChangeIt = () -> {
  x := 42  // local x, outer x remains untouched
}

print(x)

dontChangeIt()

print(x) // still 10
```

## Values

There are seven types of values that can be used in loopmaster:

```
none = undefined // the absence of a value
number = 1.00
string = 'Hello, world!' // or "string" with double quotes
boolean = true // or false
array = [1, 2, 3, 4, 5]
audio = sine(440)
function = (x, y) -> x + y
```

And two types of comments:

```
// this is a single-line comment

/* this
   is a block
   comment */
```

### Arrays

Arrays are collection of values and are defined with square brackets. They can contain any type of value, including other arrays.

```js
numbers = [1, 2, 3, 4, 5]
strings = ['Hello', 'world']
booleans = [true, false]
functions = [x -> x * 2, x -> x * 3]
arrays = [[1, 2, 3], [4, 5, 6]]
mixed = [1, 'Hello', true, [1, 2, 3], x -> x * 2]
```

### Functions

Functions are reusable pieces of code that can be called from other parts of the code to perform some task. They are defined with the `->` operator:

```js
double = x -> x * 2

print(double(5))

print(double(21))
```

Here we define a function called `double` that takes one **parameter** called `x` and returns the result of multiplying it by 2.

Functions can take multiple parameters, in which case we need to use parentheses and separate them with commas.

```js
add = (x, y) -> x + y

print(add(3, 7))

print(add(30, 12))
```

So far these functions have been a simple single **expression**. For more complex tasks, we can use curly braces to enclose multiple **statements** and expressions.

```js
multiplyAdd = (x, y, z) -> {
  result = x * y
  result + z
}

print(multiplyAdd(3, 4, 30))
```

The last expression in the function block is returned, but if we want to return earlier, we can use the `return` keyword:

```js
sawOrSine = hz -> {
  if (hz < 500) return saw(hz)
  else return sine(hz)
}

sawOrSine(300) |> out($) // move the knob above 500 to hear the sine
```

#### Default Parameters

Parameters can have default values, in which case they are optional.

```js
add = (x, y = 10) -> x + y

print(add(5))

print(add(5, 7))
```

In this case, if we don't provide a value for `y`, it will default to 10.

#### Arguments

There are three ways to pass arguments to a function parameters. **Positional**, **named** and **shorthand**.

Consider the `velvet` built-in function, which has four parameters: `input`, `room`, `damping` and `decay`.

We can call it with **positional** arguments, which must be passed in order:

```js

sd() |> velvet($, 0.8, 0.4, 0.6) |> out($)
```

But what if we just wanted to modify `decay`? We can use **named** arguments, which are passed by name:

```js

sd() |> velvet($, decay: 0.6) |> out($)
```

And finally, if we wanted we could assign first the values to variables and pass them by **shorthand**:

```js
damping = 0.4
decay = 0.6

sd() |> velvet($, decay, damping, room: 0.8) |> out($)
```

As you see the shorthand and named parameters don't need to be passed in order, and can be mixed with positional arguments.

As a final detail, the **named** parameters don't need to be fully typed, just enough letters to disambiguate from the other parameters of the function. So we could have written:

```js

sd() |> velvet($, dec: 0.6, damp: 0.4, r: 0.8) |> out($)
```

#### Fat Arrow

A common pattern when creating functions is to make a function that takes a single argument and immediately passes it to a pipe.

```js
synth = hz -> hz |> sine($/2+sine($/8)*$) |> lp($)

synth(440) |> out($)
```

For that reason there is an additional syntax that is shorthand for this, using the `=>` operator we can specify a function that does that implicitly:

```js
synth => sine($/2+sine($/8)*$) |> lp($)

synth(440) |> out($)
```

#### Closures

Functions can capture variables from the outer scope in which they are created, and that is called a **closure**.

```js
makeVoice = (osc, lfoSpeed, lfoAmount) -> {
  hz -> osc(hz+lfosine(lfoSpeed)*lfoAmount) |> lp($)/2
}

v0 = makeVoice(sine, 1/8, 444)
v1 = makeVoice(tri, 1/2, 111)

v0(c3) |> out($)

v1(g3) |> out($)
```

Using `makeVoice` we create a voice function that captures in a **closure** the variables `osc`, `lfoSpeed` and `lfoAmount` and then returns it, so now we only need to pass the `hz` argument and they remain hidden inside the voice function.

We've also passed `c3` and `g3` instead of a literal frequency. These represent the notes `C` and `G` in the **3rd** octave. An **octave** represents the **doubling** of frequency, so `c4` is exactly double the frequency of `c3` and sounds like the same note, just higher pitched.

#### Recursion

Functions can call themselves, which is called a **recursive** function.

```js
factorial = n -> {
  if (n == 0) return 1
  else return n * factorial(n-1)
}

print(factorial(5))
```

## Control Flow

The code execution (or **control**) **flows** from top-to-bottom, left-to-right, but we can also change that with **conditional statements** or **loops**.

### if and else

`if` and `else` are used to execute different code blocks based on a condition.

```js

(if (t % 4 < 2) saw(c4) else tri(e4)) |> out($)
```

Here whenever `t` modulo `4` is less than `2`, we play a sawtooth wave, otherwise we play a triangle wave.

We can also use `else if` to chain multiple conditions:

```js

(if (t % 4 < 1) saw(c4) else if (t % 4 < 2) tri(e4) else sqr(a4)) |> out($)
```

A shorter way to write these is using the **ternary** operator:

```js

(t % 4 < 1 ? saw(c4) : t % 4 < 2 ? tri(e4) : sqr(a4)) |> out($)
```

### for and while

Here we use a `for of` loop to iterate over an array of notes:

```js

for (note of [c4, e4, g4, a4]) saw(note)/4 |> out($)
```

There is also `for in` to iterate over a range of numbers:

```js

for (i in 0..3) saw(#scale[i*2]*o4)/3 |> out($)
```

### switch

We can also use `switch` to match a value against multiple cases:

```js
switch (floor(t % 4)) {
  case 0: sine(c4)
  case 1: tri(e4)
  case 2: saw(a4)
  default: sqr(e4)

} |> out($)
```

## Envelopes

### AD and ADSR

So far we've been playing constant tones that don't change over time. They sound droney and boring. To make them more rhythmic and interesting, we need to shape their volume over time. We do that with **envelopes**.

An envelope is a function that returns a value between `0` and `1` over time. It is used to shape the amplitude of a sound over time, by multiplying it with the sound signal.

Let's see an example of a simple `ad` (attack-decay) envelope:

```js

sine(a4) * ad(trig:every(1/2)) |> out($)
```

The `ad` envelope needs to be triggered by an impulse, here we use the `every` impulse generator, which, in this case, produces an impulse every half bar. We can also shape the envelope with the `attack` and `decay` parameters.

```js

sine(a4) * ad(attack:0.1, decay:0.9, trig:every(1/2)) |> out($)
```

There is also one more parameter that we can use to shape the envelope: `exponent`. It is a number that controls the curve of the envelope. The default value is `1`, which means linear, but can be any value, positive or negative.

```js

sine(a4) * ad(attack:0.001, decay:0.9, exponent:10, trig:every(1/2)) |> out($)
```

## LFOs

## Filters

As envelopes shape the volume of the sound over time, filters shape the frequency spectrum of the sound. They are called filters because they usually filter out frequencies (or subtracting them). This kind of synthesis method is called **subtractive synthesis**.

```js

saw(e4) |> lp($) |> out($)
```

There are several filters to choose from, each with its own character and use case. The most common are `lp` (lowpass), `hp` (highpass), `bp` (bandpass) and `peak` (notch). They are called like that because of their function. `lowpass` allows low frequencies to pass, filtering out the high frequncies, `highpass` allows the high frequencies, and so on.

They take a `cutoff` and a `q` parameter. The `cutoff` is the frequency at which the filter will start to attenuate the signal. The `q` is the resonance of the filter, or how much excitation is at the cutoff point.

```js

saw(e4) |> lp($, cutoff:200, q:1) |> out($)
```

## Effects

Where filters are about removing things, effects are usually about adding. Here we explore a few of the most basic effects.

### Delay

The delay is the most basic effect and it is the basis of almost every effect or filter. It is a function that takes an input signal and a delay time and returns a signal with a delay.

```js

saw(e4)*ad(trig:every(1/2)) |> $+delay($, seconds:0.25) |> out($)
```

Here we add the delay to the original signal and we get two hits instead of one. We can use the `feedback` parameter to further apply delay **to the echo** itself.

```js

saw(e4)*ad(trig:every(1/2)) |> $+delay($, seconds:0.25, feedback:0.5) |> out($)
```

### Chorus and flanger

The chorus and flanger are two effects that are very similar. They are both based on the delay effect but with very short times. The chorus applies multiple short delays to the signal where the flanger just one with extreme feedback.

```js

saw(e4)*ad(trig:every(1/2))

|> $+chorus($, voices:3, base:0.02, depth:0.006, rate:0.25, spread:0.5) |> out($)
```

```js

saw(e4)*ad(trig:every(1/2))

|> $+flanger($, rate:0.25, depth:0.006, base:0.02, feedback:0.7) |> out($)
```

### Reverb

The reverb is also based on multiple short delays with large feedbacks. It puts the sound in a room and makes it spacious and rich.

```js

saw(e4)*ad(trig:every(1/2)) |> $+dattorro($) |> out($)
```

## Rhythms

`every` is useful but very repetitive. To make rhythms more interesting, we can use the `tram` function, which is a pattern generator that repeats a pattern a given number of times.

```js

sine(e4) * ad(0.001, 0.9,10, trig:tram('x-xx-',1/2)) |> out($)
```

Let's use it with our built-in drums to see where it shines:

```js

bd(trig:tram('x-x-x-x-')) |> out($)

ch(trig:tram('xxxxxx[xx]x',1/2)) |> out($)

oh(trig:tram('-x-x-x-x')) |> out($)

sd(trig:tram('--x---x-')) |> out($)
```

There is also `euclid`, another pattern generator that is more interesting:

```js

tri(e4) * ad(0.01, 0.9,15, trig:euclid(3, 8, bar:1/2)) |> out($/2)

tri(c4) * ad(0.01, 0.9,15, trig:euclid(3, 8, 1, bar:1/2)) |> out($/2)

drums() |> out($)
```

## Melodies

There are several ways to create melody patterns in loopmaster. Let's start with a basic array containing notes:

```js
melody=[c4, e4, a4, g4]

saw(melody[t]) * ad(trig:euclid(5, 8, bar:1/2)) |> out($)
```

To pick a note from the array we use the built-in value `t`, which represents the musical **time** position. It ever only increases but because our melody has only `4` notes it wraps around every time it exceeds `4`.

There is also the `[].step()` array method that advances a position whenever it is triggered by an impulse:

```js
melody=[c4, e4, a4, g4]

saw(melody.step(every(1/4))) * ad(trig:euclid(5, 8, bar:1/2)) |> out($)
```

We can also use the `[].walk()` array method which is a shorter version of that pattern:

```js
melody=[c4, e4, a4, g4]

saw(melody.walk(1/4)) * ad(trig:euclid(5, 8, bar:1/2)) |> out($)
```

As you can see we expressed the same thing in 3 different ways. However, each has its own use case and subtleties. `[].walk` for example takes up a `swing` parameter that allows you to introduce a slight variation in the rhythm, making it more interesting:

```js
melody = [c4, e4, a4, g4]

saw(melody.walk(1/4, swing:0.5)) * ad(trig:euclid(5, 8, bar:1/2)) |> out($)
```

### Scales

Scales are collection of notes within an octave that each has its own feeling and character. They are defined with the `scale` function, which takes a scale name and returns an array of notes. The default scale is `major`, which sounds happy and uplifting.

```js
scale = 'major'

saw(#scale*o4 |> $.walk(1/4)) * ad(trig:euclid(5, 8, bar:1/2)) |> out($)
```

There are several scales to choose from, hover the `scale` variable to see them all.

#### Degrees

Each scale is composed of **degrees**. A degree is a note in the scale. The first degree is the root note, the second is the second note, and so on. In loopmaster, they are represented with the variables `#1` to `#9`.

```js
scale = 'minor'
melody = [#1, #3, #5, #7, #9]*o4

saw(melody[t]) * ad(trig:euclid(5, 8, bar:1/2)) |> out($)
```

We take the degrees from the scale and multiply them by the variable `o4` -which means the 4th octave-, to get the notes we want to play.

#### Chords

Chords are collections of notes that are played together.

```js
scale = 'minor'

chord = [#1, #3, #5, #7]*o4

chord.map(saw).avg() * ad(trig:euclid(5, 8, bar:1/2)) |> out($)
```

#### Roman Numerals

In music theory chords are represented using Roman numerals, and so in loopmaster as well they are represented with the variables `#i` to `#vii`.

```js
scale = 'minor'

chord = [#i, #iii, #v, #vii][t]*o4

chord.map(saw).avg() * ad(trig:euclid(5, 8, bar:1/2)) |> out($)
```

### Mini Notation

Mini notation is another way to create melodies and rhythms. It is borrowed from [TidalCycles](https://tidalcycles.org/docs/reference/mini_notation/) and is a powerful way to create complex patterns.

```js

play(mini('c4 f4 a4/2 e4'),(hz,vel,trig)->saw(hz)*ad(trig)|>lp($,100+10k*ad(e:8,trig),1)) |> out($)
```

## Mixing

### out and solo

`out` and `solo` are used to send a signal to the speakers.

```js

saw(e4)*ad(trig:every(1/2)) |> out($)
```

They can be used multiple times in the code. Each time they are called, they add the signal to the output.

Simply changing `out` to `solo` will mute all the other `out` calls. You can use multiple `solo` calls to selectively hear different parts of the mix.

### mix

`mix` is a special function that we optionally define that applies a chain of effects to the overall signal. It is also called **post-processing**.

```js

drums() |> out($)

mix => compressor($) |> limiter($) |> out($)
```

## Putting it all together


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

...

#### *WIP: More to come...*
