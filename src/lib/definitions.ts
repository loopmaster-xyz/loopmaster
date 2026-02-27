import type { GenDescriptor } from 'engine'
import { gens, SCALE_INTERVALS } from 'engine'

type DefinitionType = 'variable' | 'keyword' | 'function'

export interface Parameter {
  name: string
  description: string[]
  default?: number | string
  min?: number | string
  max?: number | string
  unit?: string
  type?: string
}

export interface Definition {
  type: DefinitionType
  name: string
  category: string
  description: string[]
  parameters?: Parameter[]
  return?: string
  arrayMethod?: boolean
}

export function getDocPath(def: Definition): string {
  return def.arrayMethod ? `[].${def.name.toLowerCase()}` : def.name.toLowerCase()
}

export const definitions: Map<string, Definition> = new Map()

export function definitionToCode(def: Definition, withReturn = true): string {
  if (def.parameters?.length) {
    const raw = def.arrayMethod ? def.parameters.filter(p => p.name !== 'array') : def.parameters
    const params = raw.map(p => p.default !== undefined && !p.name.endsWith('?') ? `${p.name}?` : p.name)
    const sig = def.arrayMethod
      ? `[].${def.name.toLowerCase()}(${params.join(', ')})`
      : `${def.name}(${params.join(', ')})`
    return `${sig}${withReturn ? ` -> ${def.return ?? 'signal'}` : ''}`
  }
  return def.arrayMethod ? `[].${def.name.toLowerCase()}` : def.name
}

const getDefinitionFromGen = (name: string, description: string, g: GenDescriptor): [string, Definition] => {
  return [name, {
    type: 'function',
    name,
    category: g.category ?? 'misc',
    description: [description],
    parameters: g.parameters.map(p => ({
      name: p.name,
      default: p.default,
      min: p.min,
      max: p.max,
      unit: p.unit,
      description: [p.description ?? ''],
    })),
  }]
}

for (const g of Object.values(gens)) {
  if ((g.category ?? 'misc') === 'test') continue
  if (g.variants) {
    for (const [name, description] of Object.entries(g.variants)) {
      definitions.set(...getDefinitionFromGen(name.toLowerCase(), description ?? '', g))
    }
  }
  else {
    definitions.set(...getDefinitionFromGen(g.name.toLowerCase(), g.description ?? '', g))
  }
}

export const extra: [string, Definition][] = [
  ['t', {
    type: 'variable',
    name: 't',
    category: 'utilities',
    description: ['BPM adjusted time elapsed: 1 t = 1 bar.'],
    parameters: [],
    return: 'number',
  }],
  ['map', {
    type: 'function',
    name: 'map',
    arrayMethod: true,
    category: 'utilities',
    description: ['Applies a function to each element of an array.'],
    return: 'array',
    parameters: [
      {
        name: 'fn',
        description: ['The function to apply.'],
        type: 'function',
      },
    ],
  }],
  ['shuffle', {
    type: 'function',
    name: 'shuffle',
    arrayMethod: true,
    category: 'utilities',
    description: ['Shuffles array in place using Fisher-Yates. Optional seed for deterministic shuffle.'],
    return: 'array',
    parameters: [
      { name: 'seed', description: ['Random seed for reproducibility.'], default: 0 },
    ],
  }],
  ['reverse', {
    type: 'function',
    name: 'reverse',
    arrayMethod: true,
    category: 'utilities',
    description: ['Returns a new array with elements in reverse order.'],
    return: 'array',
    parameters: [],
  }],
  ['print', {
    type: 'function',
    name: 'print',
    category: 'utilities',
    description: ['Emit value for debugging; returns the value.'],
    parameters: [{ name: 'value', description: ['Value to emit.'] }],
  }],
  ['play', {
    type: 'function',
    name: 'play',
    category: 'utilities',
    description: [
      'Multi-voice playback. x is [hz,vel,trig] or array of such. Calls cb(hz,vel,trig) per voice, sums and averages.',
    ],
    return: 'signal',
    parameters: [
      { name: 'x', description: ['[hz,vel,trig] or array of [hz,vel,trig] per voice.'] },
      { name: 'cb', description: ['Callback (hz, vel, trig) -> signal.'], type: 'function' },
      { name: 'voices', description: ['Number of voices.'], default: 1 },
    ],
  }],
  ['ntof', {
    type: 'function',
    name: 'ntof',
    category: 'utilities',
    description: ['Converts a midi note to a frequency in Hz. Applies transpose and tune from globals.'],
    return: 'hz',
    parameters: [
      {
        name: 'note',
        min: 0,
        max: 256,
        description: ['The midi note to convert to a frequency in Hz.'],
      },
    ],
  }],
  ['dtof', {
    type: 'function',
    name: 'dtof',
    category: 'utilities',
    description: [
      'Degree to frequency: converts scale degree (1-based) to Hz using global scale and root. Desugars to midiToHz(degreeToMidi(...)).',
    ],
    return: 'hz',
    parameters: [{ name: 'degree', description: ['Scale degree (1-based).'] }],
  }],
  ['#i', {
    type: 'variable',
    name: '#i',
    category: 'utilities',
    description: ['Roman numeral chord I as Hz array in octave -1. Also #ii..#vii, suffixes like #i7sus2.'],
  }],
  ['#1', {
    type: 'variable',
    name: '#1',
    category: 'utilities',
    description: ['Scale degree 1 as Hz scalar in octave -1. Also #2..#9.'],
  }],
  ['#scale', {
    type: 'variable',
    name: '#scale',
    category: 'utilities',
    description: ['Full scale degrees 1..N as Hz array in octave -1.'],
  }],
  ['o0', {
    type: 'variable',
    name: 'o0',
    category: 'utilities',
    description: ['Octave multipliers: o0=1, o1=2, o2=4, ... o11=2048 (2^0..2^11).'],
  }],
  ['c4', {
    type: 'variable',
    name: 'c4',
    category: 'utilities',
    description: ['Note names as Hz: c4, e#5, eb3, a-1. Format [a-gA-G][#b]?-?\\d+. User vars shadow.'],
  }],
  ['scale', {
    type: 'variable',
    name: 'scale',
    category: 'utilities',
    description: [
      'Set scale by name, e.g: scale=\'minor\'.\n\nDefault: \'major\'.\n\nAvailable:\n\n'
      + Object.keys(SCALE_INTERVALS).join(', ') + '.',
    ],
  }],
  ['root', {
    type: 'variable',
    name: 'root',
    category: 'utilities',
    description: ['Set root note: root=\'a4\'. Default: c4.'],
  }],
  ['transpose', {
    type: 'variable',
    name: 'transpose',
    category: 'utilities',
    description: ['Shift pitch by N semitones. Affects c4, # vars, dtof, mini. Default: 0.'],
  }],
  ['tune', {
    type: 'variable',
    name: 'tune',
    category: 'utilities',
    description: ['Multiply frequencies (e.g. tune=2 = octave up). Default: 1.'],
  }],
  ['out', {
    type: 'function',
    name: 'out',
    category: 'mixing',
    description: ['Sends a signal to the speakers.'],
    parameters: [
      {
        name: 'signal',
        description: [
          'The signal to send to the speakers.',
        ],
      },
    ],
  }],
  ['bus', {
    type: 'function',
    name: 'bus',
    category: 'mixing',
    description: ['Read bus: bus(index). Write and accumulate: bus(index, in).'],
    parameters: [
      { name: 'index', description: ['Bus index 0–9.'] },
      { name: 'in', description: ['Signal to add (when writing). Omit to read.'], type: 'signal' },
    ],
  }],
  ['buss', {
    type: 'function',
    name: 'buss',
    category: 'mixing',
    description: ['Solo a signal from a bus.'],
    parameters: [
      { name: 'index', description: ['Bus index.'] },
      { name: 'in', description: ['Signal to solo.'] },
    ],
  }],
  ['outs', {
    type: 'function',
    name: 'outs',
    category: 'mixing',
    description: ['Alias for `solo`.'],
    parameters: [
      {
        name: 'signal',
        description: ['The signal to solo.'],
      },
    ],
  }],
  ['solo', {
    type: 'function',
    name: 'solo',
    category: 'mixing',
    description: ['Solo a signal.'],
    parameters: [
      {
        name: 'signal',
        description: ['The signal to solo.'],
      },
    ],
  }],
  ['sout', {
    type: 'function',
    name: 'sout',
    category: 'mixing',
    description: ['Alias for solo. Solo a signal.'],
    parameters: [{ name: 'signal', description: ['The signal to solo.'] }],
  }],
  ['mini', {
    type: 'function',
    name: 'mini',
    category: 'sequencers',
    description: ['Plays a sequence of notes.'],
    parameters: [
      {
        name: 'sequence',
        description: ['The sequence of notes to play.'],
      },
      {
        name: 'bars',
        description: ['The number of bars to fit the sequence in.'],
      },
    ],
  }],
  ['tram', {
    type: 'function',
    name: 'tram',
    category: 'sequencers',
    description: ['Plays a sequence of beats.'],
    parameters: [
      {
        name: 'sequence',
        description: ['The sequence of beats to play.'],
      },
      {
        name: 'bars',
        description: ['The number of bars to fit the sequence in.'],
      },
    ],
  }],
  ['label', {
    type: 'function',
    name: 'label',
    category: 'sequencers',
    description: [
      'Compile-time only. Creates a label for timeline header/minimap visualization. Bar 1-based: label(1, \'intro\'), label(5, \'verse\', 2). Color 0–5, default 1.',
    ],
    parameters: [
      { name: 'bar', description: ['Bar position (1-based).'], type: 'number' },
      { name: 'text', description: ['Label text.'], type: 'string' },
      { name: 'color', description: ['Theme color index 0–5.'], default: 1, min: 0, max: 5, type: 'number' },
    ],
  }],
  ['timeline', {
    type: 'function',
    name: 'timeline',
    category: 'sequencers',
    description: [
      'Value curve over time. Pattern: value pairs and glides, e.g. `0,0 1,1` (hold 0, glide to 1). Use `-` for one-shot (no wrap). Outputs 0–1. Color 0–5.',
    ],
    parameters: [
      {
        name: 'pattern',
        description: [
          'Pattern string: space-separated segments. Each segment is `value` (hold) or `from,to` (glide). Optional `-` for no wrap.',
        ],
      },
      {
        name: 'color',
        description: ['Optional theme color index 0–5: red, green, yellow, blue, purple, cyan.'],
        default: 1,
        min: 0,
        max: 5,
        type: 'number',
      },
    ],
    return: 'signal',
  }],
  ['oversample', {
    type: 'function',
    name: 'oversample',

    category: 'utilities',
    description: ['Oversamples a function by a factor.'],
    parameters: [
      {
        name: 'factor',
        description: ['The factor to oversample by. Must be a scalar.'],
      },
      {
        name: 'fn',
        type: 'function',
        description: ['The function to oversample.'],
      },
    ],
  }],
  ['record', {
    type: 'function',
    name: 'record',

    category: 'samplers',
    description: ['Records a function.'],
    parameters: [
      {
        name: 'duration: seconds',
        description: ['The duration of the recording in seconds.'],
      },
      {
        name: 'fn: () -> signal',
        description: ['The function to record.'],
      },
    ],
  }],
  ['Walk', {
    type: 'function',
    name: 'Walk',
    arrayMethod: true,
    category: 'sequencers',
    description: ['Tempo-synced walk over an array.'],
    parameters: [
      { name: 'array', description: ['Array to walk.'] },
      { name: 'bar', description: ['Bars per step.'] },
      { name: 'swing', description: ['Optional swing amount.'] },
      { name: 'offset', description: ['Optional phase offset.'] },
    ],
  }],
  ['Step', {
    type: 'function',
    name: 'Step',
    arrayMethod: true,
    category: 'sequencers',
    description: ['Step through array on each trigger.'],
    parameters: [
      { name: 'array', description: ['Array to step.'] },
      { name: 'trig', description: ['Trigger impulse.'] },
    ],
  }],
  ['Random', {
    type: 'function',
    name: 'Random',
    arrayMethod: true,
    category: 'sequencers',
    description: ['Pick a random element from the array on trigger.'],
    return: 'signal',
    parameters: [
      { name: 'trig', description: ['Trigger. On rising edge, pick new element.'] },
      { name: 'seed', description: ['Seed for deterministic random.'], default: 0 },
    ],
  }],
  ['Glide', {
    type: 'function',
    name: 'Glide',
    arrayMethod: true,
    category: 'sequencers',
    description: [
      'Tempo-synced glide through array. Steps through elements over bar length, interpolates between consecutive elements with curve. Wraps index.',
    ],
    return: 'signal',
    parameters: [
      { name: 'bar', description: ['Length of each step in bars.'] },
      { name: 'exponent', description: ['Interpolation curve.'], default: 1 },
    ],
  }],
  ['alloc', {
    type: 'function',
    name: 'alloc',

    category: 'utilities',
    description: ['Allocate a buffer for the given duration in seconds.'],
    parameters: [{ name: 'seconds', description: ['Buffer length in seconds.'] }],
  }],
  ['write', {
    type: 'function',
    name: 'write',

    category: 'utilities',
    description: ['Write input signal into buffer.'],
    parameters: [
      { name: 'input', description: ['Input signal.'] },
      { name: 'buffer', description: ['Buffer from alloc().'] },
    ],
  }],
  ['read', {
    type: 'function',
    name: 'read',

    category: 'utilities',
    description: ['Read from buffer at time offset in seconds.'],
    parameters: [
      { name: 'buffer', description: ['Buffer from alloc().'] },
      { name: 'offset', description: ['Read position in seconds.'] },
    ],
  }],
  ['freesound', {
    type: 'function',
    name: 'freesound',

    category: 'samplers',
    description: ['Load sample by Freesound ID.'],
    parameters: [{ name: 'id', description: ['Freesound sample ID.'] }],
  }],
  ['espeak', {
    type: 'function',
    name: 'espeak',
    category: 'samplers',
    description: [
      'Text-to-speech using eSpeak.',
    ],
    return: 'sample',
    parameters: [
      { name: 'text', description: ['Text to speak. Must be a literal string.'], type: 'string' },
      {
        name: 'variant',
        description: [
          'Variants: m1 m2 m3 m4 m5 m6 m7 f1 f2 f3 f4 f5 croak klatt klatt2 klatt3 whisper whisperf',
        ],
        default: 'm1',
        type: 'string',
      },
      {
        name: 'speed',
        description: ['Speech rate.'],
        default: 0.5,
        min: 0,
        max: 1,
        type: 'number',
        unit: 'normal',
      },
      {
        name: 'pitch',
        description: ['Pitch.'],
        default: 0.5,
        min: 0,
        max: 1,
        type: 'number',
        unit: 'normal',
      },
    ],
  }],
  ['sam', {
    type: 'function',
    name: 'sam',
    category: 'samplers',
    description: [
      'Classic SAM (Software Automatic Mouth) speech synthesis.',
    ],
    return: 'sample',
    parameters: [
      { name: 'text', description: ['Text to speak'], type: 'string' },
      {
        name: 'pitch',
        description: ['Pitch.'],
        default: 0.5,
        min: 0,
        max: 1,
        type: 'number',
        unit: 'normal',
      },
      {
        name: 'speed',
        description: ['Speed.'],
        default: 0.5,
        min: 0,
        max: 1,
        type: 'number',
        unit: 'normal',
      },
      {
        name: 'mouth',
        description: ['Mouth shape.'],
        default: 0.5,
        min: 0,
        max: 1,
        type: 'number',
        unit: 'normal',
      },
      {
        name: 'throat',
        description: ['Throat shape.'],
        default: 0.5,
        min: 0,
        max: 1,
        type: 'number',
        unit: 'normal',
      },
      {
        name: 'singmode',
        description: ['Sing mode.'],
        min: 0,
        max: 1,
        type: 'number',
        unit: 'normal',
      },
      {
        name: 'phonetic',
        description: ['Phonetic input flag.'],
        default: 0,
        min: 0,
        max: 1,
        type: 'number',
        unit: 'flag',
      },
    ],
  }],
  ['isundefined', {
    type: 'function',
    name: 'isundefined',

    category: 'utilities',
    description: ['True if value is undefined.'],
    parameters: [{ name: 'value', description: ['Value to check.'] }],
  }],
  ['isscalar', {
    type: 'function',
    name: 'isscalar',

    category: 'utilities',
    description: ['True if value is a scalar.'],
    parameters: [{ name: 'value', description: ['Value to check.'] }],
  }],
  ['isaudio', {
    type: 'function',
    name: 'isaudio',

    category: 'utilities',
    description: ['True if value is an audio rate signal.'],
    parameters: [{ name: 'value', description: ['Value to check.'] }],
  }],
  ['isarray', {
    type: 'function',
    name: 'isarray',

    category: 'utilities',
    description: ['True if value is an array.'],
    parameters: [{ name: 'value', description: ['Value to check.'] }],
  }],
  ['isfunction', {
    type: 'function',
    name: 'isfunction',

    category: 'utilities',
    description: ['True if value is a function.'],
    parameters: [{ name: 'value', description: ['Value to check.'] }],
  }],
  ['avg', {
    type: 'function',
    name: 'avg',

    category: 'utilities',
    description: ['Average of array elements.'],
    parameters: [{ name: 'array', description: ['Array of numbers.'] }],
  }],
  ['delay', {
    type: 'function',
    name: 'delay',

    category: 'effects',
    description: ['Delay effect.'],
    parameters: [
      { name: 'input', description: ['Input signal'] },
      { name: 'seconds', description: ['Delay time'], default: 0.5, min: 0, max: 'size', unit: 's' },
      { name: 'feedback', description: ['Feedback amount'], default: 0, unit: 'normal' },
      { name: 'cb', description: ['Feedback callback'], default: 'x -> x', unit: 'callback' },
      { name: 'size', description: ['Buffer size'], default: 1, unit: 's' },
    ],
  }],
  ['tube', {
    type: 'function',
    name: 'tube',
    category: 'effects',
    description: ['Soft saturation / tube-style distortion.'],
    parameters: [
      { name: 'in', description: ['Input signal.'] },
      { name: 'drive', description: ['Drive amount.'], default: 3 },
      { name: 'bias', description: ['DC bias.'], default: 0.2 },
    ],
  }],
  ['moddelay', {
    type: 'function',
    name: 'moddelay',
    category: 'effects',
    description: ['Modulated delay with LFO-controlled delay time.'],
    parameters: [
      { name: 'in', description: ['Input signal.'] },
      { name: 'base', description: ['Base delay time in seconds.'] },
      { name: 'depth', description: ['LFO modulation depth.'] },
      { name: 'rate', description: ['LFO rate.'] },
      { name: 'feedback', description: ['Feedback amount.'] },
      { name: 'offset', description: ['LFO phase offset.'], default: 0 },
    ],
  }],
  ['flanger', {
    type: 'function',
    name: 'flanger',
    category: 'effects',
    description: ['Classic flanger (modulated comb filter).'],
    parameters: [
      { name: 'in', description: ['Input signal.'] },
      { name: 'rate', description: ['Modulation rate.'], default: 1 },
      { name: 'depth', description: ['Modulation depth.'], default: 0.00125 },
      { name: 'base', description: ['Base delay time.'], default: 0.00125 },
      { name: 'feedback', description: ['Feedback amount.'], default: 0.7 },
    ],
  }],
  ['chorus', {
    type: 'function',
    name: 'chorus',
    category: 'effects',
    description: ['Multi-voice chorus with spread and modulation.'],
    parameters: [
      { name: 'in', description: ['Input signal.'] },
      { name: 'voices', description: ['Number of chorus voices.'], default: 3 },
      { name: 'base', description: ['Base delay time.'], default: 0.02 },
      { name: 'depth', description: ['Modulation depth.'], default: 0.006 },
      { name: 'rate', description: ['Modulation rate.'], default: 0.25 },
      { name: 'spread', description: ['Phase spread between voices.'], default: 0.5 },
    ],
  }],
  ['karplus', {
    type: 'function',
    name: 'karplus',

    category: 'synths',
    description: ['Karplus-Strong plucked string synthesis.'],
    parameters: [
      { name: 'hz', description: ['Frequency.'] },
      { name: 'pluck', description: ['Pluck source (default pink).'] },
      { name: 'seed', description: ['Random seed.'] },
      { name: 'attack', description: ['Attack time.'] },
      { name: 'decay', description: ['Decay time.'] },
      { name: 'exponent', description: ['Decay curve.'] },
      { name: 'damping', description: ['Damping amount.'] },
      { name: 'trig', description: ['Trigger.'] },
    ],
  }],
  ['rhodes', {
    type: 'function',
    name: 'rhodes',
    category: 'synths',
    description: ['Rhodes-style electric piano. Tine FM, tone-bar resonances, chorus.'],
    parameters: [
      { name: 'hz', description: ['Frequency.'] },
      { name: 'vel', description: ['Velocity 0–1.'], default: 1 },
      { name: 'trig', description: ['Trigger.'] },
    ],
  }],
  ['rhodes70', {
    type: 'function',
    name: 'rhodes70',
    category: 'synths',
    description: ['Vintage Rhodes-style (70s): purer fundamental, tone-bar resonances, subtle chorus.'],
    parameters: [
      { name: 'hz', description: ['Frequency.'] },
      { name: 'vel', description: ['Velocity 0–1.'], default: 1 },
      { name: 'trig', description: ['Trigger.'] },
    ],
  }],
  ['supersaw', {
    type: 'function',
    name: 'supersaw',
    category: 'synths',
    description: ['Supersaw oscillator with detuned voices.'],
    parameters: [
      { name: 'hz', description: ['Frequency.'] },
      { name: 'voices', description: ['Number of detuned voices.'], default: 5 },
      { name: 'spread', description: ['Detune spread.'], default: 0.05 },
    ],
  }],
  ['bdsynth', {
    type: 'function',
    name: 'bdsynth',
    category: 'synths',
    description: ['Kick/bass drum synth. Used internally by bd().'],
    parameters: [
      { name: 'base', description: ['Base frequency.'], default: 'ntof(60)' },
      { name: 'punch', description: ['Punch frequency.'], default: '25000k' },
      { name: 'offset', description: ['Pitch offset.'], default: 0.0006 },
      { name: 'cutoff', description: ['Filter cutoff.'], default: '5k' },
      { name: 'q', description: ['Filter Q.'], default: 0.25 },
      { name: 'amp', description: ['Amp envelope (trig -> signal).'] },
      { name: 'fm', description: ['FM envelope (trig -> signal).'] },
      { name: 'filter', description: ['Filter envelope (trig -> signal).'] },
      { name: 'trig', description: ['Trigger pattern.'], default: 'tram(\'x-x-x-x-\')' },
    ],
  }],
  ['bd', {
    type: 'function',
    name: 'bd',
    category: 'synths',
    description: ['Kick drum. Records bdsynth and plays back on trigger.'],
    parameters: [{ name: 'trig', description: ['Trigger. Default every 1/4 bar.'], default: 'every(1/4)' }],
  }],
  ['hhsynth', {
    type: 'function',
    name: 'hhsynth',
    category: 'synths',
    description: ['Hi-hat synthesis. Used by ch and oh.'],
    parameters: [
      { name: 'width', description: ['Pulse width.'], default: 0.4 },
      { name: 'trig', description: ['Trigger.'] },
    ],
  }],
  ['ch', {
    type: 'function',
    name: 'ch',
    category: 'synths',
    description: ['Closed hi-hat. Recorded hhsynth, played on trigger.'],
    parameters: [
      { name: 'width', description: ['Hi-hat width.'], default: 0.9 },
      { name: 'trig', description: ['Trigger pattern.'], default: 'tram(\'xxxx\',1/4)' },
    ],
  }],
  ['oh', {
    type: 'function',
    name: 'oh',
    category: 'synths',
    description: ['Open hi-hat.'],
    parameters: [
      { name: 'width', description: ['Hi-hat width.'], default: 0.4 },
      { name: 'trig', description: ['Trigger pattern.'], default: 'tram(\'-x\',1/4)' },
    ],
  }],
  ['sdsynth', {
    type: 'function',
    name: 'sdsynth',
    category: 'synths',
    description: ['Snare drum synthesis. Used by sd.'],
    parameters: [
      { name: 'seed', description: ['Random seed.'], default: 7 },
      { name: 'base', description: ['Base frequency.'], default: 'ntof(70)' },
      { name: 'trig', description: ['Trigger.'], default: 'step(1-phasor(1),.9)' },
    ],
  }],
  ['sd', {
    type: 'function',
    name: 'sd',
    category: 'synths',
    description: ['Snare drum. Recorded sdsynth, played on trigger.'],
    parameters: [
      { name: 'seed', description: ['Random seed.'] },
      { name: 'trig', description: ['Trigger pattern.'], default: 'tram(\'-x\',1/2)' },
    ],
  }],
  ['drums', {
    type: 'function',
    name: 'drums',
    category: 'synths',
    description: ['Full drum kit: kick, snare, closed hi-hat, open hi-hat.'],
    parameters: [{ name: 'seed', description: ['Random seed for variation.'], default: 1 }],
  }],
  ['mix', {
    type: 'variable',
    name: 'mix',

    category: 'utilities',
    description: ['Mix bus; receives the main mix.'],
  }],
  ['bpm', {
    type: 'variable',
    name: 'bpm',

    category: 'utilities',
    description: ['Global BPM (default 120).'],
  }],
  ['sin', { type: 'function', name: 'sin', category: 'math', description: ['Sine.'],
    parameters: [{ name: 'x', description: ['Radians.'] }] }],
  ['cos', { type: 'function', name: 'cos', category: 'math', description: ['Cosine.'],
    parameters: [{ name: 'x', description: ['Radians.'] }] }],
  ['tan', { type: 'function', name: 'tan', category: 'math', description: ['Tangent.'],
    parameters: [{ name: 'x', description: ['Radians.'] }] }],
  ['asin', { type: 'function', name: 'asin', category: 'math', description: ['Arc sine.'],
    parameters: [{ name: 'x', description: ['Value in [-1,1].'] }] }],
  ['acos', { type: 'function', name: 'acos', category: 'math', description: ['Arc cosine.'],
    parameters: [{ name: 'x', description: ['Value in [-1,1].'] }] }],
  ['atan', { type: 'function', name: 'atan', category: 'math', description: ['Arc tangent.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['tanh', { type: 'function', name: 'tanh', category: 'math', description: ['Hyperbolic tangent.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['abs', { type: 'function', name: 'abs', category: 'math', description: ['Absolute value.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['sqrt', { type: 'function', name: 'sqrt', category: 'math', description: ['Square root.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['square', { type: 'function', name: 'square', category: 'math', description: ['x squared.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['cube', { type: 'function', name: 'cube', category: 'math', description: ['x cubed.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['log', { type: 'function', name: 'log', category: 'math', description: ['Natural logarithm.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['exp', { type: 'function', name: 'exp', category: 'math', description: ['e to the power of x.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['log10', { type: 'function', name: 'log10', category: 'math', description: ['Base-10 logarithm.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['log2', { type: 'function', name: 'log2', category: 'math', description: ['Base-2 logarithm.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['exp2', { type: 'function', name: 'exp2', category: 'math', description: ['2 to the power of x.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['floor', { type: 'function', name: 'floor', category: 'math', description: ['Round down.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['ceil', { type: 'function', name: 'ceil', category: 'math', description: ['Round up.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['round', { type: 'function', name: 'round', category: 'math', description: ['Round to nearest.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['trunc', { type: 'function', name: 'trunc', category: 'math', description: ['Truncate toward zero.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['fract', { type: 'function', name: 'fract', category: 'math', description: ['Fractional part.'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['sign', { type: 'function', name: 'sign', category: 'math', description: ['Sign of x (-1, 0, or 1).'],
    parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['isnan', { type: 'function', name: 'isnan', category: 'math', description: ['1 if x is NaN. 0 otherwise.'],
    return: '1 | 0', parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['isinf', { type: 'function', name: 'isinf', category: 'math', description: ['1 if x is infinite. 0 otherwise.'],
    return: '1 | 0', parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['heaviside', { type: 'function', name: 'heaviside', category: 'math',
    description: ['Step function: 0 if x<0 else 1.'], parameters: [{ name: 'x', description: ['Value.'] }] }],
  ['min', { type: 'function', name: 'min', category: 'math', description: ['Minimum of x and y.'],
    parameters: [{ name: 'x', description: ['Value.'] }, { name: 'y', description: ['Value.'] }] }],
  ['max', { type: 'function', name: 'max', category: 'math', description: ['Maximum of x and y.'],
    parameters: [{ name: 'x', description: ['Value.'] }, { name: 'y', description: ['Value.'] }] }],
  ['hypot', { type: 'function', name: 'hypot', category: 'math', description: ['Hypotenuse sqrt(x*x+y*y).'],
    parameters: [{ name: 'x', description: ['Value.'] }, { name: 'y', description: ['Value.'] }] }],
  ['mod', { type: 'function', name: 'mod', category: 'math', description: ['Modulo.'],
    parameters: [{ name: 'x', description: ['Value.'] }, { name: 'y', description: ['Divisor.'] }] }],
  ['snap', { type: 'function', name: 'snap', category: 'math', description: ['Snap x to nearest multiple of y.'],
    parameters: [{ name: 'x', description: ['Value.'] }, { name: 'y', description: ['Grid size.'] }] }],
  ['step', { type: 'function', name: 'step', category: 'math', description: ['0 if x < edge else 1.'],
    parameters: [{ name: 'edge', description: ['Threshold.'] }, { name: 'x', description: ['Value.'] }] }],
  ['safediv', { type: 'function', name: 'safediv', category: 'math', description: ['Division; 0 if y is 0.'],
    parameters: [{ name: 'x', description: ['Numerator.'] }, { name: 'y', description: ['Denominator.'] }] }],
  ['swing', { type: 'function', name: 'swing', category: 'math', description: ['Swing amount.'],
    parameters: [{ name: 'x', description: ['Phase.'] }, { name: 'y', description: ['Amount.'] }] }],
  ['clamp', { type: 'function', name: 'clamp', category: 'math', description: ['Clamp x to [lo, hi].'],
    parameters: [{ name: 'x', description: ['Value.'] }, { name: 'lo', description: ['Min.'] }, { name: 'hi',
      description: ['Max.'] }] }],
  ['lerp', { type: 'function', name: 'lerp', category: 'math', description: ['Linear interpolation.'],
    parameters: [{ name: 'a', description: ['Start.'] }, { name: 'b', description: ['End.'] }, { name: 't',
      description: ['Factor 0..1.'] }] }],
  ['wrap', { type: 'function', name: 'wrap', category: 'math', description: ['Wrap x into [lo, hi).'],
    parameters: [{ name: 'x', description: ['Value.'] }, { name: 'lo', description: ['Min.'] }, { name: 'hi',
      description: ['Max.'] }] }],
  ['pingpong', { type: 'function', name: 'pingpong', category: 'math', description: ['Ping-pong between lo and hi.'],
    parameters: [{ name: 'x', description: ['Value.'] }, { name: 'lo', description: ['Min.'] }, { name: 'hi',
      description: ['Max.'] }] }],
  ['fold', { type: 'function', name: 'fold', category: 'math', description: ['Fold x into [lo, hi].'],
    parameters: [{ name: 'x', description: ['Value.'] }, { name: 'lo', description: ['Min.'] }, { name: 'hi',
      description: ['Max.'] }] }],
  ['smoothstep', {
    type: 'function',
    name: 'smoothstep',

    category: 'math',
    description: ['Smooth Hermite step.'],
    parameters: [{ name: 'edge0', description: ['Start edge.'] }, { name: 'edge1', description: ['End edge.'] }, {
      name: 'x',
      description: ['Value.'],
    }],
  }],
  ['smootherstep', {
    type: 'function',
    name: 'smootherstep',

    category: 'math',
    description: ['Smoother step (5th order).'],
    parameters: [{ name: 'edge0', description: ['Start edge.'] }, { name: 'edge1', description: ['End edge.'] }, {
      name: 'x',
      description: ['Value.'],
    }],
  }],
  ['select', { type: 'function', name: 'select', category: 'math', description: ['a if cond else b.'],
    parameters: [{ name: 'cond', description: ['Condition.'] }, { name: 'a', description: ['If true.'] }, { name: 'b',
      description: ['If false.'] }] }],
  ['dec', { type: 'function', name: 'dec', category: 'math',
    description: ['Decrement from offset to floor at hz rate, trigger reset.'],
    parameters: [{ name: 'hz', description: ['Rate.'], default: 1 }, { name: 'floor', description: ['Floor value.'],
      default: 0 }, { name: 'offset', description: ['Value on trigger.'], default: 1 }, { name: 'trig',
      description: ['Trigger impulse.'] }] }],
]

extra.forEach(([name, definition]) => {
  definitions.set(name, definition)
})

for (const def of definitions.values()) {
  if (def.arrayMethod) definitions.set(getDocPath(def), def)
}

export function getDefinitionByDocPath(docPath: string): Definition | undefined {
  const decoded = decodeURIComponent(docPath)
  return definitions.get(decoded) ?? definitions.get(decoded.toLowerCase())
}

// aliases
// definitions.set('midiToHz', definitions.get('ntof')!)
