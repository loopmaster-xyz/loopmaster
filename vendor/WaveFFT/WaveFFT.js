import Module from './dist/fft.js';

export default class WaveFFT {
    /**
     * Check if a number is a valid FFT size (power of two)
     * @param {number} size - Size to check
     * @returns {boolean} True if valid FFT size
     */
    static isValidSize(size) {
        return Number.isInteger(size) && size > 0 && (size & (size - 1)) === 0;
    }
    /**
     * Create a new WaveFFT instance
     * @param {number} size - FFT size (must be power of 2)
     */
    constructor(size) {
        this.size = size;
        this.module = null;
        this.realPtr = null;
        this.imagPtr = null;
        this.cqtOutputRealPtr = null;
        this.cqtOutputImagPtr = null;
        this.memoryGeneration = 0;
        this._initialized = false;
        this._cqtInitialized = false;
    }

    /**
     * Initialize the WebAssembly module and allocate buffers
     * @returns {Promise<void>} Resolves when initialization is complete
     * @throws {Error} If FFT size is invalid or initialization fails
     */
    async init() {
        if (!Number.isInteger(this.size) || this.size <= 0) {
            throw new Error("FFT size must be a positive integer");
        }

        if (!WaveFFT.isValidSize(this.size)) {
            throw new Error("FFT size must be a power of two");
        }

        this.module = await Module();

        this.HEAPF32 = this.module.HEAPF32;

        if (!this.module._initFFT(this.size)) {
            throw new Error("Failed to initialize FFT");
        }

        this._allocateBuffers();
        this._initialized = true;
    }

    _allocateBuffers() {
        this._freeBuffers();

        this.realPtr = this.module._malloc(this.size * 4);
        this.imagPtr = this.module._malloc(this.size * 4);

        if (!this.realPtr || !this.imagPtr) {
            this._freeBuffers();
            throw new Error("Memory allocation failed");
        }

        this._updateArrayViews();
    }

    _freeBuffers() {
        if (this.realPtr) {
            this.module._free(this.realPtr);
            this.realPtr = null;
        }
        if (this.imagPtr) {
            this.module._free(this.imagPtr);
            this.imagPtr = null;
        }
    }

    _updateArrayViews() {
        this.memoryGeneration = this.module.HEAPF32.buffer.byteLength;
        this.real = new Float32Array(this.module.HEAPF32.buffer, this.realPtr, this.size);
        this.imag = new Float32Array(this.module.HEAPF32.buffer, this.imagPtr, this.size);

        if (this.cqtOutputRealPtr && this._cqtInitialized) {
            this.cqtOutputReal = new Float32Array(this.module.HEAPF32.buffer, this.cqtOutputRealPtr, this.cqtTotalBins);
            this.cqtOutputImag = new Float32Array(this.module.HEAPF32.buffer, this.cqtOutputImagPtr, this.cqtTotalBins);
        }
    }

    _checkMemoryResize() {
        // Use a local reference to avoid race conditions
        const currentBuffer = this.module.HEAPF32.buffer;
        const currentByteLength = currentBuffer.byteLength;

        if (currentByteLength !== this.memoryGeneration) {
            if (currentBuffer === this.module.HEAPF32.buffer) {
                this._updateArrayViews();
            } else {
                // Buffer changed during check, recurse to handle it
                this._checkMemoryResize();
            }
        }
    }

    /**
     * Resize the FFT to a new size
     * @param {number} newSize - New FFT size (must be power of two)
     * @returns {Promise<void>} Resolves when resize is complete
     * @throws {Error} If FFT not initialized, size invalid, or resize fails
     */
    async resize(newSize) {
        if (!this._initialized) {
            throw new Error("FFT not initialized");
        }

        if (!Number.isInteger(newSize) || newSize <= 0) {
            throw new Error("FFT size must be a positive integer");
        }

        if (!WaveFFT.isValidSize(newSize)) {
            throw new Error("FFT size must be a power of two");
        }

        if (newSize === this.size) {
            return;
        }

        // Store CQT parameters if initialized
        let cqtParams = null;
        if (this._cqtInitialized) {
            cqtParams = {
                binsPerOctave: this.cqtBinsPerOctave,
                octaves: this.cqtOctaves,
                sampleRate: this.cqtSampleRate,
                minFreq: this.cqtMinFreq
            };
        }

        this.size = newSize;

        if (!this.module._initFFT(this.size)) {
            throw new Error("Failed to resize FFT");
        }

        this._allocateBuffers();

        // Re-initialize CQT if it was previously initialized
        if (cqtParams) {
            await this.initCQT(
                cqtParams.binsPerOctave,
                cqtParams.octaves,
                cqtParams.sampleRate,
                cqtParams.minFreq
            );
        }
    }

    /**
     * Perform forward FFT on real-valued input data
     * @param {Float32Array} inputReal - Real-valued input samples (length must equal FFT size)
     * @param {Object} [output=null] - Optional pre-allocated output object with real and imag Float32Arrays
     * @returns {Object} Object with real and imag Float32Arrays containing complex FFT result
     * @throws {Error} If module not initialized or input size mismatch
     */
    fft(inputReal, output = null) {
        if (!this.module || !this._initialized) {
            throw new Error("Module not initialized");
        }
        if (!inputReal || inputReal.length !== this.size) {
            throw new Error("Input array must match FFT size");
        }

        this._checkMemoryResize();

        this.real.set(inputReal);
        this.imag.fill(0);

        if (!this.module._fft(this.realPtr, this.imagPtr, this.size)) {
            throw new Error("FFT computation failed");
        }

        if (output) {
            output.real.set(this.real);
            output.imag.set(this.imag);
            return output;
        }
        return { real: new Float32Array(this.real), imag: new Float32Array(this.imag) };
    }

    /**
     * Perform forward FFT on complex input data.
     * @param {Float32Array} inputReal - Real part of input
     * @param {Float32Array} inputImag - Imaginary part of input
     * @param {Object} output - Optional output object with real and imag arrays
     * @returns {Object} Object with real and imag Float32Arrays
     */
    fftComplex(inputReal, inputImag, output = null) {
        if (!this.module || !this._initialized) {
            throw new Error("Module not initialized");
        }
        if (!inputReal || !inputImag || inputReal.length !== this.size || inputImag.length !== this.size) {
            throw new Error("Input arrays must match FFT size");
        }

        this._checkMemoryResize();

        this.real.set(inputReal);
        this.imag.set(inputImag);

        if (!this.module._fft(this.realPtr, this.imagPtr, this.size)) {
            throw new Error("FFT computation failed");
        }

        if (output) {
            output.real.set(this.real);
            output.imag.set(this.imag);
            return output;
        }
        return { real: new Float32Array(this.real), imag: new Float32Array(this.imag) };
    }

    /**
     * Perform inverse FFT
     * @param {Float32Array} inputReal - Real part of input
     * @param {Float32Array} inputImag - Imaginary part of input
     * @param {Object} output - Optional output object with real and imag arrays
     * @returns {Object} Object with real and imag Float32Arrays
     */
    ifft(inputReal, inputImag, output = null) {
        if (!this.module || !this._initialized) {
            throw new Error("Module not initialized");
        }
        if (!inputReal || !inputImag || inputReal.length !== this.size || inputImag.length !== this.size) {
            throw new Error("Input arrays must match FFT size");
        }

        this._checkMemoryResize();

        this.real.set(inputReal);
        this.imag.set(inputImag);

        if (!this.module._ifft(this.realPtr, this.imagPtr, this.size)) {
            throw new Error("IFFT computation failed");
        }

        if (output) {
            output.real.set(this.real);
            output.imag.set(this.imag);
            return output;
        }
        return { real: new Float32Array(this.real), imag: new Float32Array(this.imag) };
    }

    /**
     * Compute magnitude spectrum from complex FFT result
     * @param {Object} fftResult - Object with real and imag arrays
     * @returns {Float32Array} Magnitude spectrum (length = size/2 + 1)
     */
    getMagnitudeSpectrum(fftResult) {
        if (!fftResult || !fftResult.real || !fftResult.imag) {
            throw new Error("Invalid FFT result object");
        }

        const magnitude = new Float32Array(Math.floor(this.size / 2) + 1);
        for (let i = 0; i < magnitude.length; i++) {
            const re = fftResult.real[i];
            const im = fftResult.imag[i];
            magnitude[i] = Math.sqrt(re * re + im * im);
        }
        return magnitude;
    }

    /**
     * Initialize Constant-Q Transform (CQT) for musical/pitch analysis
     * @param {number} binsPerOctave - Number of frequency bins per octave (e.g., 12 for semitones)
     * @param {number} octaves - Number of octaves to analyze
     * @param {number} sampleRate - Sample rate of the audio in Hz (e.g., 44100)
     * @param {number} minFreq - Minimum frequency in Hz (e.g., 27.5 for A0)
     * @returns {Promise<void>} Resolves when CQT initialization is complete
     * @throws {Error} If parameters are invalid or initialization fails
     */
    async initCQT(binsPerOctave, octaves, sampleRate, minFreq) {
        if (!this.module || !this._initialized) {
            throw new Error("Module not initialized");
        }
        if (!Number.isInteger(binsPerOctave) || !Number.isInteger(octaves) ||
            binsPerOctave <= 0 || octaves <= 0 || sampleRate <= 0 || minFreq <= 0) {
            throw new Error("Invalid CQT parameters");
        }

        // Store parameters
        this.cqtBinsPerOctave = binsPerOctave;
        this.cqtOctaves = octaves;
        this.cqtSampleRate = sampleRate;
        this.cqtMinFreq = minFreq;
        this.cqtTotalBins = binsPerOctave * octaves;

        if (!this.module._initCQT(binsPerOctave, octaves, this.size, sampleRate, minFreq)) {
            throw new Error("Failed to initialize CQT");
        }

        if (this.cqtOutputRealPtr) this.module._free(this.cqtOutputRealPtr);
        if (this.cqtOutputImagPtr) this.module._free(this.cqtOutputImagPtr);

        this.cqtOutputRealPtr = this.module._malloc(this.cqtTotalBins * 4);
        this.cqtOutputImagPtr = this.module._malloc(this.cqtTotalBins * 4);
        if (!this.cqtOutputRealPtr || !this.cqtOutputImagPtr) {
            if (this.cqtOutputRealPtr) this.module._free(this.cqtOutputRealPtr);
            if (this.cqtOutputImagPtr) this.module._free(this.cqtOutputImagPtr);
            this.cqtOutputRealPtr = null;
            this.cqtOutputImagPtr = null;
            this._cqtInitialized = false;
            throw new Error("Memory allocation failed in initCQT");
        }

        this._cqtInitialized = true;
        this._updateArrayViews();
    }

    /**
     * Perform Constant-Q Transform on real-valued input
     * @param {Float32Array} inputReal - Real-valued input samples (length must equal FFT size)
     * @param {Object} [output=null] - Optional pre-allocated output with real and imag Float32Arrays
     * @returns {Object} Object with real and imag Float32Arrays containing CQT result
     * @throws {Error} If CQT not initialized or input size mismatch
     */
    cqt(inputReal, output = null) {
        if (!this.module || !this._initialized || !this._cqtInitialized) {
            throw new Error("CQT not initialized");
        }
        if (!inputReal || inputReal.length !== this.size) {
            throw new Error("Input array must match FFT size");
        }

        this._checkMemoryResize();

        this.real.set(inputReal);
        this.imag.fill(0);

        if (!this.module._fft(this.realPtr, this.imagPtr, this.size)) {
            throw new Error("FFT computation failed");
        }

        if (!this.module._cqt(
            this.realPtr,
            this.imagPtr,
            this.cqtOutputRealPtr,
            this.cqtOutputImagPtr,
            this.size,
            this.cqtBinsPerOctave,
            this.cqtOctaves
        )) {
            throw new Error("CQT computation failed");
        }

        if (output) {
            output.real.set(this.cqtOutputReal);
            output.imag.set(this.cqtOutputImag);
            return output;
        }
        return {
            real: new Float32Array(this.cqtOutputReal),
            imag: new Float32Array(this.cqtOutputImag)
        };
    }

    /**
     * Generate a Hann window
     * @param {number} N - Window size
     * @returns {Float32Array} Window coefficients
     */
    static hann(N) {
        const w = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
        }
        return w;
    }

    /**
     * Generate a Hamming window
     * @param {number} N - Window size
     * @returns {Float32Array} Window coefficients
     */
    static hamming(N) {
        const w = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
        }
        return w;
    }

    /**
     * Generate a Blackman window
     * @param {number} N - Window size
     * @returns {Float32Array} Window coefficients
     */
    static blackman(N) {
        const w = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            w[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
                  + 0.08 * Math.cos((4 * Math.PI * i) / (N - 1));
        }
        return w;
    }

    /**
     * Perform Short-Time Fourier Transform (STFT)
     * @param {Float32Array} samples - Input audio samples
     * @param {Object} options - STFT options
     * @param {number} options.fftSize - FFT size (must match this instance's size)
     * @param {number} options.hopSize - Hop size between frames
     * @param {Float32Array} options.window - Optional window function (defaults to Hann)
     * @returns {Object} Object containing spectrogram data
     */
    stft(samples, { fftSize = this.size, hopSize = Math.floor(fftSize / 2), window = null } = {}) {
        if (!this.module || !this._initialized) {
            throw new Error("Module not initialized");
        }
        if (fftSize !== this.size) {
            throw new Error(`FFT size mismatch. Expected ${this.size}, got ${fftSize}`);
        }
        if (!samples || samples.length === 0) {
            throw new Error("Input samples array is empty");
        }
        if (hopSize <= 0) {
            throw new Error("Hop size must be positive");
        }

        const wnd = window || WaveFFT.hann(fftSize);
        const length = samples.length;
        let totalFrames = Math.floor((length - fftSize) / hopSize) + 1;
        if (totalFrames < 1) {
            // If input is too short, we'll do just one frame with zero-padding
            totalFrames = 1;
        }

        const freqBins = Math.floor(fftSize / 2) + 1;
        const magnitudes = new Array(totalFrames);
        const complex = new Array(totalFrames);

        let maxMagnitude = 0;

        for (let frameIdx = 0, sampleOffset = 0; frameIdx < totalFrames; frameIdx++, sampleOffset += hopSize) {
            this.real.fill(0);
            this.imag.fill(0);

            const frameLength = Math.min(fftSize, length - sampleOffset);
            for (let i = 0; i < frameLength; i++) {
                this.real[i] = samples[sampleOffset + i] * wnd[i];
            }

            if (!this.module._fft(this.realPtr, this.imagPtr, this.size)) {
                throw new Error("FFT computation failed");
            }

            const frameComplex = new Float32Array(fftSize * 2);
            for (let i = 0; i < fftSize; i++) {
                frameComplex[i * 2] = this.real[i];
                frameComplex[i * 2 + 1] = this.imag[i];
            }
            complex[frameIdx] = frameComplex;

            const frameMagnitudes = new Float32Array(freqBins);
            for (let bin = 0; bin < freqBins; bin++) {
                const re = this.real[bin];
                const im = this.imag[bin];
                const mag = Math.sqrt(re * re + im * im);
                if (mag > maxMagnitude) maxMagnitude = mag;
                frameMagnitudes[bin] = mag;
            }
            magnitudes[frameIdx] = frameMagnitudes;
        }

        return {
            magnitudes,     // 2D array of magnitude spectra
            complex,        // 2D array of complex spectra
            fftSize,
            hopSize,
            freqBins,
            timeBins: totalFrames,
            maxMagnitude,
            sampleRate: null  // Can be provided by caller if needed
        };
    }

    /**
     * Perform Inverse Short-Time Fourier Transform (ISTFT)
     * @param {Array<Float32Array>} complexFrames - Complex spectra frames
     * @param {Object} options - ISTFT options
     * @param {number} options.fftSize - FFT size (must match this instance's size)
     * @param {number} options.hopSize - Hop size between frames
     * @param {Float32Array} options.window - Optional window function (defaults to Hann)
     * @returns {Float32Array} Reconstructed audio samples
     */
    istft(complexFrames, { fftSize = this.size, hopSize = Math.floor(fftSize / 2), window = null } = {}) {
        if (!this.module || !this._initialized) {
            throw new Error("Module not initialized");
        }
        if (fftSize !== this.size) {
            throw new Error(`FFT size mismatch. Expected ${this.size}, got ${fftSize}`);
        }

        const wnd = window || WaveFFT.hann(fftSize);
        const frameCount = complexFrames.length;
        const outputLength = (frameCount - 1) * hopSize + fftSize;
        const output = new Float32Array(outputLength);
        const windowSum = new Float32Array(outputLength);

        for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
            const frameComplex = complexFrames[frameIdx];

            for (let i = 0; i < fftSize; i++) {
                this.real[i] = frameComplex[i * 2];
                this.imag[i] = frameComplex[i * 2 + 1];
            }

            if (!this.module._ifft(this.realPtr, this.imagPtr, this.size)) {
                throw new Error("IFFT computation failed");
            }

            // Overlap-add with windowing
            const offset = frameIdx * hopSize;
            for (let i = 0; i < fftSize; i++) {
                output[offset + i] += this.real[i] * wnd[i];
                windowSum[offset + i] += wnd[i] * wnd[i];
            }
        }

        // Normalize by window sum to maintain amplitude
        for (let i = 0; i < outputLength; i++) {
            if (windowSum[i] > 1e-9) {
                output[i] /= windowSum[i];
            }
        }

        return output;
    }

    /**
     * Free all allocated WebAssembly memory and cleanup resources
     * @returns {void}
     */
    dispose() {
        if (this.module) {
            this._freeBuffers();
            if (this.cqtOutputRealPtr) this.module._free(this.cqtOutputRealPtr);
            if (this.cqtOutputImagPtr) this.module._free(this.cqtOutputImagPtr);

            this.module._freeFFT();
            this.module._freeCQT();

            this.module = null;
            this.realPtr = this.imagPtr = this.cqtOutputRealPtr = this.cqtOutputImagPtr = null;
            this.real = this.imag = this.cqtOutputReal = this.cqtOutputImag = null;
            this._initialized = false;
            this._cqtInitialized = false;
        }
    }
}
