import { isMobile } from 'utils/is-mobile'
import { signalify } from './lib/signalify.ts'

export const settings = signalify({
  audioLatency: isMobile() ? 0.5 : 0.01,
  showVisuals: true,
  showKnobs: true,
  showDocs: true,
  wordWrap: true,
  analyserType: 'waveform' as 'waveform' | 'spectrum' | 'amplitude',
  debug: false,
})
