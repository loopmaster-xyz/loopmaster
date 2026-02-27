import WaveFFT from './WaveFFT.js';

/**
 * Web Worker for efficient audio processing with WaveFFT
 * Handles STFT, ISTFT, and spectrogram operations
 *
 * Message types:
 * - 'stft': Perform Short-Time Fourier Transform
 * - 'istft': Perform Inverse STFT
 * - 'resynth': Resynthesize audio with modified magnitudes (preserves phase)
 * - 'partialStft': Perform STFT on a portion of audio
 */

const fftInstances = new Map();

async function getFFTInstance(size) {
  if (!fftInstances.has(size)) {
    const fft = new WaveFFT(size);
    try {
      await fft.init();
      fftInstances.set(size, fft);
    } catch (error) {
      throw new Error(`Failed to initialize FFT with size ${size}: ${error.message}`);
    }
  }
  return fftInstances.get(size);
}

onmessage = async (e) => {
  const message = e.data;

  if (message.type === 'stft') {
    let { samples, fftSize, hop } = message;

    const fft = await getFFTInstance(fftSize);

    const result = fft.stft(samples, {
      fftSize,
      hopSize: hop,
      window: WaveFFT.hann(fftSize)
    });

    postMessage({
      type: 'stftDone',
      spectrogram: result.magnitudes,
      origComplex: result.complex,
      timeBins: result.timeBins,
      freqBins: result.freqBins,
      maxMag: result.maxMagnitude
    });

  } else if (message.type === 'resynth') {
    let { spectrogram, origComplex, fftSize, hop } = message;

    const fft = await getFFTInstance(fftSize);

    let freqBins = fftSize / 2 + 1;
    let framesCount = origComplex.length;
    let newFrames = new Array(framesCount);

    // Apply new magnitudes while preserving phase
    for (let timeIndex = 0; timeIndex < framesCount; timeIndex++) {
      let oldSpec = origComplex[timeIndex];
      let newSpec = new Float32Array(oldSpec.length);
      for (let freqIndex = 0; freqIndex < freqBins; freqIndex++) {
        let real = oldSpec[freqIndex * 2], imag = oldSpec[freqIndex * 2 + 1];
        let angle = Math.atan2(imag, real);
        let newMagnitude = spectrogram[timeIndex][freqIndex];
        let newReal = newMagnitude * Math.cos(angle);
        let newImag = newMagnitude * Math.sin(angle);
        newSpec[freqIndex * 2] = newReal; newSpec[freqIndex * 2 + 1] = newImag;
      }
      // Mirror for negative frequencies
      for (let freqIndex = freqBins; freqIndex < fftSize; freqIndex++) {
        let conjugateIndex = (fftSize - freqIndex) * 2;
        newSpec[freqIndex * 2] = newSpec[conjugateIndex];
        newSpec[freqIndex * 2 + 1] = -newSpec[conjugateIndex + 1];
      }
      newFrames[timeIndex] = newSpec;
    }

    const out = fft.istft(newFrames, {
      fftSize,
      hopSize: hop,
      window: WaveFFT.hann(fftSize)
    });

    postMessage({ type: 'resynthDone', data: out }, [out.buffer]);

  } else if (message.type === 'istft') {
    let { frames, fftSize, hop } = message;

    const fft = await getFFTInstance(fftSize);

    const out = fft.istft(frames, {
      fftSize,
      hopSize: hop,
      window: WaveFFT.hann(fftSize)
    });

    postMessage({ type: 'istftDone', samples: out }, [out.buffer]);

  } else if (message.type === 'partialStft') {
    let { samples, fftSize, hop, offsetFrame } = message;

    const fft = await getFFTInstance(fftSize);

    const result = fft.stft(samples, {
      fftSize,
      hopSize: hop,
      window: WaveFFT.hann(fftSize)
    });

    postMessage({
      type: 'partialStftDone',
      partialSpectrogram: result.magnitudes,
      partialComplex: result.complex,
      offsetFrame
    });
  }
};

self.addEventListener('unload', () => {
  for (const fft of fftInstances.values()) {
    fft.dispose();
  }
  fftInstances.clear();
});