/// <reference types="vite/client" />

declare module 'wavefft' {
  export default class WaveFFT {
    constructor(size: number)
    init(): Promise<void>
    fft(input: Float32Array): { real: Float32Array; imag: Float32Array }
    ifft(real: Float32Array, imag: Float32Array): Float32Array
    getMagnitudeSpectrum(result: { real: Float32Array; imag: Float32Array }): Float32Array
    stft(samples: Float32Array, options: { fftSize: number; hopSize: number; window?: Float32Array }): Float32Array[][]
    istft(frames: Float32Array[][], options: { hopSize: number; window?: Float32Array }): Float32Array
    dispose(): void
    static hann(size: number): Float32Array
    static hamming(size: number): Float32Array
    static blackman(size: number): Float32Array
  }
}
