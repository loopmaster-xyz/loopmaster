#!/bin/bash

# Build script for WaveFFT
# Usage: ./build.sh [--no-cqt]

# Ensure dist directory exists
mkdir -p dist

# Default build with CQT support
if [[ "$1" == "--no-cqt" ]]; then
    echo "Building WaveFFT without CQT support..."
    emcc src/fft.cpp -O3 -msimd128 \
        -D FFT_INCLUDE_CQT=0 \
        -s MODULARIZE=1 \
        -s EXPORT_ES6=1 \
        -s EXPORTED_FUNCTIONS='["_malloc","_free","_fft","_ifft","_initFFT","_freeFFT","_freeCQT"]' \
        -s EXPORTED_RUNTIME_METHODS='["HEAPF32"]' \
        -o dist/fft.js

    echo "Lite build complete! Files in dist/"
else
    echo "Building WaveFFT with CQT support..."
    emcc src/fft.cpp -O3 -msimd128 \
        -s MODULARIZE=1 \
        -s EXPORT_ES6=1 \
        -s EXPORTED_FUNCTIONS='["_malloc","_free","_fft","_ifft","_initFFT","_freeFFT","_initCQT","_cqt","_freeCQT"]' \
        -s EXPORTED_RUNTIME_METHODS='["HEAPF32"]' \
        -o dist/fft.js

    echo "Full build complete! Files in dist/"
fi

echo "Build available as dist/fft.js and dist/fft.wasm"