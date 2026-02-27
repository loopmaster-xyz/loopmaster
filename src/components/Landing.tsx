import { Link } from '../router.tsx'
import { Logo } from './Logo.tsx'

import {
  ArrowsClockwiseIcon,
  BookOpenIcon,
  ChalkboardTeacherIcon,
  CodeIcon,
  GlobeIcon,
  LightningIcon,
  MusicNotesIcon,
  RepeatIcon,
  ShareIcon,
  UserCircleIcon,
  WaveformIcon,
  WaveSawtoothIcon,
} from '@phosphor-icons/react'
import { useSignal } from '@preact/signals'
import { isMobile } from 'utils/is-mobile'
import { docs } from '../lib/docs.ts'
import {
  backgroundColor,
  primaryColor,
  primaryGradientStyle,
  secondaryColor,
  showIntro,
  widgetOptions,
  themeName,
  themeVariation,
} from '../state.ts'
import { InlineEditor } from './InlineEditor.tsx'
import themes from '../themes/_all.json'

const exampleCode = `
fm=>sine($+sine($/2)*$*4)*ad(trig:every(1/8))

  |> lps($,cutoff:500+1000*ad(trig:every(1/8))**70,q:.9)*.3

melody=[62,69,65] fm(melody[t*4]|>ntof($))+drums() |> out($)
`

const selectedExamples = [
  'delay',
  'freeverb',
  'velvet',
  'fdn',
  'dattorro',
  'diodeladder',
  'adsr',
  'at',
].sort(() => Math.random() - 0.5).map(example => docs[example as keyof typeof docs] ?? '')

selectedExamples.unshift(exampleCode)

const features = [
  {
    title: 'Live Coding',
    description: 'Write audio code in real-time. See and hear your changes instantly as you type.',
    icon: LightningIcon,
  },
  {
    title: 'Powerful DSP',
    description:
      'Built-in synthesizers, effects, filters, and sequencing tools. All running in WebAssembly for maximum performance.',
    icon: WaveformIcon,
  },
  {
    title: 'Visual Feedback',
    description:
      'Visual widgets in the editor show waveforms, envelopes, and triggers. Understand your audio visually.',
    icon: WaveSawtoothIcon,
  },
  {
    title: 'Sequencing',
    description: 'Arrange your code in a timeline and create complete songs.',
    icon: MusicNotesIcon,
  },
  {
    title: 'No Installation',
    description: 'Runs entirely in your browser. No plugins, no downloads. Just open and create.',
    icon: GlobeIcon,
  },
  {
    title: 'Open Source',
    description: 'Built with modern web technologies. Extensible and transparent.',
    icon: CodeIcon,
  },
]

const communityFeatures = [
  {
    title: 'Artist Page',
    description: 'Showcase your unique sound and creations with your own artist page.',
    icon: UserCircleIcon,
  },
  {
    title: 'Publish Your Loops',
    description: 'Share your audio code with the community. Let others discover and learn from your work.',
    icon: ShareIcon,
  },
  {
    title: 'Remix Loops',
    description: 'Take inspiration from others and make it your own. Build upon the community\'s creativity.',
    icon: RepeatIcon,
  },
]

const testimonials = [
  {
    quote: 'The most intuitive audio programming environment I\'ve used. The live coding experience is incredible.',
    author: 'Carl C.',
    role: 'Electronic Music Producer',
  },
  {
    quote:
      'Finally, a tool that makes audio programming accessible. The visual feedback helps me understand what I\'m creating.',
    author: 'Sam R.',
    role: 'Sound Designer',
  },
  {
    quote: 'I love being able to experiment with sounds directly in the browser. No setup, just pure creativity.',
    author: 'Jordan K.',
    role: 'Music Technologist',
  },
]

const ActionButton = ({ to, text, icon }: { to: string; text: string; icon: preact.JSX.Element }) => {
  return (
    <Link
      to={to}
      class={`flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold`}
      style={{
        ...primaryGradientStyle.value,
        clipPath: 'polygon(12.5px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 12.5px) 100%, 0 100%, 0 10px)',
        textShadow: `0px 1.25px 0px #000`,
      }}
    >
      <div class="relative">
        <div class="text-black relative top-[1.25px]">
          {icon}
        </div>
        <div class="absolute top-0 left-0 w-full h-full text-white">
          {icon}
        </div>
      </div>
      <span>{text}</span>
    </Link>
  )
}

const ActionGrayButton = ({ to, text, icon }: { to: string; text: string; icon: preact.JSX.Element }) => {
  return (
    <Link
      to={to}
      class={`flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold bg-gradient-to-br from-neutral-500 to-neutral-700`}
      style={{
        clipPath: 'polygon(12.5px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 12.5px) 100%, 0 100%, 0 10px)',
        textShadow: `0px 1.25px 0px #000`,
      }}
    >
      <div class="relative">
        <div class="text-black relative top-[1.25px]">
          {icon}
        </div>
        <div class="absolute top-0 left-0 w-full h-full text-white">
          {icon}
        </div>
      </div>
      <span>{text}</span>
    </Link>
  )
}

const EnterAppButton = () => {
  return <ActionButton to="/projects" text="Enter App" icon={<CodeIcon weight="regular" size={24} />} />
}

const BrowseLoopsButton = () => {
  return isMobile()
    ? <ActionButton to="/browse/newest" text="Browse Tracks" icon={<GlobeIcon weight="regular" size={24} />} />
    : <ActionGrayButton to="/browse/newest" text="Browse Tracks" icon={<GlobeIcon weight="regular" size={24} />} />
}

const ReadTheDocsButton = () => {
  return <ActionGrayButton to="/docs" text="Read the Docs" icon={<BookOpenIcon weight="regular" size={24} />} />
}

const ReadTutorialsButton = () => {
  return (
    <ActionGrayButton to="/tutorials" text="Read Tutorials"
      icon={<ChalkboardTeacherIcon weight="regular" size={24} />} />
  )
}

const Card = ({ children, class: className = '' }: { children: preact.ComponentChildren; class?: string }) => (
  <div
    class={`flex flex-col p-6 border-b-2 border-[${primaryColor.value}] bg-white/5 hover:border-[${secondaryColor.value}] transition-colors ${className}`}
  >
    {children}
  </div>
)

export function Landing() {
  showIntro.value = false

  widgetOptions.showVisuals = true
  widgetOptions.showKnobs = true
  widgetOptions.noHeader = true

  const code = useSignal(exampleCode)

  const selectedExampleIndex = useSignal<number>(0)

  const randomHistory = useSignal<{ name: string; variation: 'A' | 'B' | 'C' }[]>([{
    name: themeName.value,
    variation: themeVariation.value,
  }])
  const randomHistoryIndex = useSignal<number>(0)

  const randomizeTheme = () => {
    if (randomHistoryIndex.value === randomHistory.value.length - 1) {
      const theme = themes[Math.floor(Math.random() * themes.length)]
      themeName.value = theme.name
      const variations = ['A', 'B', 'C'] as const
      themeVariation.value = variations[Math.floor(Math.random() * variations.length)]
      randomHistory.value = [
        ...randomHistory.value,
        { name: theme.name, variation: themeVariation.value },
      ]
      randomHistoryIndex.value++
    }
    else {
      const { name, variation } = randomHistory.value[++randomHistoryIndex.value]
      themeName.value = name
      themeVariation.value = variation
    }
  }

  const previousTheme = (event: MouseEvent) => {
    event.preventDefault()
    if (randomHistoryIndex.value === 0) return
    const { name, variation } = randomHistory.value[--randomHistoryIndex.value]
    themeName.value = name
    themeVariation.value = variation
  }

  return (
    <div class={`min-h-screen bg-[${backgroundColor.value}] text-white relative`}>
      <div class="relative">
        {/* Hero Section */}
        <section class="relative">
          <div class="relative max-w-7xl mx-auto px-6 py-6 md:py-14">
            <div class="flex flex-col items-center justify-center text-center mb-12">
              <Logo
                text="loopmaster"
                size={isMobile() ? '3.5em' : '4.1em'}
                onClick={randomizeTheme}
                onContextMenu={previousTheme}
              />
              <div class="mt-9 flex gap-4 justify-center items-center flex-wrap">
                <BrowseLoopsButton />
                {!isMobile() && <EnterAppButton />}
                <ReadTutorialsButton />
              </div>
            </div>

            {/* Example Editor */}
            <div class="mt-8 max-w-3xl mx-auto">
              <div class="mb-4 text-center">
                <h2 class="text-2xl font-semibold text-white mb-2">Try it live</h2>
                {!isMobile() && <p class="text-neutral-400">Press play and edit the code below to hear your changes</p>}
              </div>
              <div class="flex justify-start">
                <button class="p-2 flex items-center gap-2 text-neutral-400 hover:text-white hover:bg-white/5"
                  onClick={() => {
                    code.value = selectedExamples[++selectedExampleIndex.value % selectedExamples.length]
                      ?? ''
                  }}
                >
                  <ArrowsClockwiseIcon weight="regular" size={16} />
                  Try a different example
                </button>
              </div>
              <div class={`bg-black border-b-2 border-[${primaryColor.value}]`}>
                <InlineEditor id="landing-example" autoHeight={true} code={code.value} persisted={false} />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section class="py-20 relative">
          <div class="max-w-7xl mx-auto px-6 relative z-10">
            <div class="text-center mb-16">
              <h2 class="text-4xl font-bold text-white mb-4">Everything you need</h2>
              <p class="text-xl text-neutral-400 max-w-2xl mx-auto">
                A complete audio programming environment built for creativity
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, i) => {
                const IconComponent = feature.icon
                return (
                  <Card key={i}>
                    <div class={`mb-4 text-[${secondaryColor.value}] flex items-center gap-4`}>
                      <IconComponent weight="regular" size={48} />
                      <h3 class="text-xl font-semibold text-white">{feature.title}</h3>
                    </div>
                    <p class="text-neutral-400 leading-relaxed">{feature.description}</p>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Join a Community Section */}
        <section class="py-20 relative">
          <div class="max-w-7xl mx-auto px-6 relative z-10">
            <div class="text-center mb-16">
              <h2 class="text-4xl font-bold text-white mb-4">Join a Community</h2>
              <p class="text-xl text-neutral-400 max-w-2xl mx-auto">
                Connect with creators, share your work, and collaborate
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              {communityFeatures.map((feature, i) => {
                const IconComponent = feature.icon
                return (
                  <Card key={i}>
                    <div class={`mb-4 text-[${secondaryColor.value}] flex items-center gap-4`}>
                      <IconComponent weight="regular" size={48} />
                      <h3 class="text-xl font-semibold text-white">{feature.title}</h3>
                    </div>
                    <p class="text-neutral-400 leading-relaxed">{feature.description}</p>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section class="py-20 relative">
          <div class="max-w-7xl mx-auto px-6 relative z-10">
            <div class="text-center mb-16">
              <h2 class="text-4xl font-bold text-white mb-4">What creators are saying</h2>
              <p class="text-xl text-neutral-400">Join the community of audio programmers</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, i) => (
                <Card key={i} class="justify-between">
                  <p class="text-neutral-300 leading-relaxed mb-4 italic">"{testimonial.quote}"</p>
                  <div class={`pt-4 border-t-2 border-[${secondaryColor.value}]`}>
                    <p class="font-semibold text-white">{testimonial.author}</p>
                    <p class="text-sm text-neutral-500">{testimonial.role}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section class="py-20 relative">
          <div class="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 class="text-4xl font-bold text-white mb-4">Ready to create?</h2>
            <p class="text-xl text-neutral-400 mb-8 max-w-2xl mx-auto">
              Start coding your sounds right now.<br />No signup required, no installation needed.
            </p>
            <div class="flex gap-4 justify-center items-center flex-wrap">
              <BrowseLoopsButton />
              {!isMobile() && <EnterAppButton />}
              <ReadTutorialsButton />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer class="py-12">
          <div class="max-w-7xl mx-auto px-6">
            <div class="flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <Logo
                  text="loopmaster"
                  size="2em"
                  onClick={randomizeTheme}
                  onContextMenu={previousTheme}
                />
              </div>
              <div class="flex flex-col md:flex-row items-center justify-center gap-6 text-neutral-400">
                <Link
                  title="Discord"
                  class="text-sm border-none rounded-md cursor-pointer font-semibold text-white hover:text-[#4c6dee] flex items-center gap-2"
                  to="https://discord.gg/NSWaB9dRYh"
                  target="_blank"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="32" height="32"
                    viewBox="0 0 20 20"
                  >
                    <path d="M16.074,4.361a14.243,14.243,0,0,0-3.61-1.134,10.61,10.61,0,0,0-.463.96,13.219,13.219,0,0,0-4,0,10.138,10.138,0,0,0-.468-.96A14.206,14.206,0,0,0,3.919,4.364,15.146,15.146,0,0,0,1.324,14.5a14.435,14.435,0,0,0,4.428,2.269A10.982,10.982,0,0,0,6.7,15.21a9.294,9.294,0,0,1-1.494-.727c.125-.093.248-.19.366-.289a10.212,10.212,0,0,0,8.854,0c.119.1.242.2.366.289a9.274,9.274,0,0,1-1.5.728,10.8,10.8,0,0,0,.948,1.562,14.419,14.419,0,0,0,4.431-2.27A15.128,15.128,0,0,0,16.074,4.361Zm-8.981,8.1a1.7,1.7,0,0,1-1.573-1.79A1.689,1.689,0,0,1,7.093,8.881a1.679,1.679,0,0,1,1.573,1.791A1.687,1.687,0,0,1,7.093,12.462Zm5.814,0a1.7,1.7,0,0,1-1.573-1.79,1.689,1.689,0,0,1,1.573-1.791,1.679,1.679,0,0,1,1.573,1.791A1.688,1.688,0,0,1,12.907,12.462Z" />
                  </svg>
                </Link>
                <Link
                  title="Feedback"
                  class={`hover:text-[${secondaryColor.value}] transition-colors border-b-2 border-transparent hover:border-[${secondaryColor.value}]`}
                  to="https://loopmaster.featurebase.app/"
                  target="_blank"
                >
                  Feedback
                </Link>
                <Link to="/docs"
                  class={`hover:text-[${secondaryColor.value}] transition-colors border-b-2 border-transparent hover:border-[${secondaryColor.value}]`}
                >
                  Documentation
                </Link>
                <Link to="/about"
                  class={`hover:text-[${secondaryColor.value}] transition-colors border-b-2 border-transparent hover:border-[${secondaryColor.value}]`}
                >
                  Contact
                </Link>
              </div>
            </div>
            <div class="mt-8 text-center text-sm text-neutral-500">
              © {new Date().getFullYear()} loopmaster. Built for music hackers.
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
