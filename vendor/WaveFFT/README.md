# WaveFFT

High-performance FFT and CQT library for web audio using WebAssembly. Process audio data efficiently with minimal latency and memory overhead.

## Features

- **Fast FFT/IFFT** - Optimized radix-2 implementation in WASM
- **STFT/ISTFT** - Build spectrograms and reconstruct audio
- **CQT** - Constant-Q Transform for musical analysis
- **Window Functions** - Built-in Hann, Hamming, and Blackman windows
- **Web Worker Support** - Non-blocking processing for large datasets

## Installation

```bash
npm install wavefft
```

## Quick Start

```javascript
import WaveFFT from 'wavefft';

// Basic FFT analysis
const fft = new WaveFFT(2048);  // Size must be power of 2
await fft.init();

// Convert time-domain audio to frequency-domain
const audioData = new Float32Array(2048);  // Your audio samples
const result = fft.fft(audioData);
const magnitudes = fft.getMagnitudeSpectrum(result);

// Each bin represents: sampleRate / fftSize Hz
// For 44.1kHz audio: bin[1] = 21.5Hz, bin[2] = 43Hz, etc.

fft.dispose();  // Always clean up
```

## Common Use Cases

### Real-time Spectrum Analysis

```javascript
// Apply window to reduce spectral leakage
const window = WaveFFT.hann(2048);
const windowed = audioData.map((v, i) => v * window[i]);
const spectrum = fft.fft(windowed);
```

### Creating Spectrograms

```javascript
// STFT splits audio into overlapping frames
const spectrogram = fft.stft(longAudioBuffer, {
  fftSize: 2048,     // Frequency resolution
  hopSize: 512,      // Time resolution (1/4 overlap)
  window: WaveFFT.hann(2048)
});
// Returns 2D array: [time_frames][frequency_bins]
```

### Audio Reconstruction

```javascript
// Process in frequency domain, then convert back
const processed = fft.ifft(modifiedReal, modifiedImag);
```

## Example: Audio Denoising with Web Worker

Remove background noise while preserving speech using the included worker:

```javascript
const worker = new Worker('./WaveFFTWorker.js', { type: 'module' });

// Step 1: Analyze audio with STFT
worker.postMessage({
  type: 'stft',
  samples: noisyAudio,
  fftSize: 2048,
  hop: 512
});

worker.onmessage = (e) => {
  if (e.data.type === 'stftDone') {
    const { spectrogram, origComplex } = e.data;

    // Step 2: Reduce noise (keep voice frequencies 300-3400 Hz)
    const sampleRate = 44100;
    const binHz = sampleRate / 2048;  // Hz per frequency bin

    for (let time = 0; time < spectrogram.length; time++) {
      for (let bin = 0; bin < spectrogram[time].length; bin++) {
        const freq = bin * binHz;

        // Suppress frequencies outside voice range
        if (freq < 300 || freq > 3400) {
          spectrogram[time][bin] *= 0.1;  // Reduce by 90%

          // Update complex values to maintain phase consistency
          const realIdx = bin * 2;
          const imagIdx = bin * 2 + 1;
          origComplex[time][realIdx] *= 0.1;
          origComplex[time][imagIdx] *= 0.1;
        }
      }
    }

    // Step 3: Reconstruct clean audio
    worker.postMessage({
      type: 'resynth',
      spectrogram: spectrogram,
      origComplex: origComplex,
      fftSize: 2048,
      hop: 512
    });
  }

  if (e.data.type === 'resynthDone') {
    // Play the cleaned audio
    const audioCtx = new AudioContext();
    const buffer = audioCtx.createBuffer(1, e.data.data.length, 44100);
    buffer.getChannelData(0).set(e.data.data);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  }
};
```

## API Reference

### Core Methods

```javascript
new WaveFFT(size)              // Create instance (size = power of 2)
await fft.init()               // Initialize WASM module
fft.fft(input)                 // Forward FFT -> {real, imag}
fft.ifft(real, imag)           // Inverse FFT -> Float32Array
fft.getMagnitudeSpectrum(result)  // Complex -> magnitude array
fft.dispose()                  // Free WASM memory
```

### STFT (Spectrograms)

```javascript
fft.stft(samples, {
  fftSize: 2048,               // Frequency resolution
  hopSize: 512,                // Overlap between frames
  window: Float32Array         // Optional windowing
})

fft.istft(frames, {            // Reconstruct audio from STFT
  hopSize: 512,
  window: Float32Array
})
```

### Window Functions

```javascript
WaveFFT.hann(size)             // Reduces spectral leakage
WaveFFT.hamming(size)          // Good for speech
WaveFFT.blackman(size)         // Excellent sidelobe suppression
```

## Building

```bash
npm run build       # Full build with CQT
npm run build:lite  # Without CQT (smaller size)
```

## License

MIT Copyright 2025 Hunter Delattre
