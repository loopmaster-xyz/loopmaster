import { isMobile } from 'utils/is-mobile'
import { signalify } from './lib/signalify.ts'

export const settings = signalify({
  audioLatency: isMobile() ? 0.5 : 0.01,
  syncChanges: false,
  useCtrlEnter: false,
  showVisuals: true,
  showKnobs: true,
  showShaders: false,
  effect: 'none' as 'none' | 'shake' | 'glitch',
  showDocs: true,
  wordWrap: true,
  showMinimap: false,
  overscroll: false,
  analyserType: 'waveform' as 'waveform' | 'spectrum' | 'amplitude',
  fullSize: false,
  debug: false,
})
