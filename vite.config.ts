import preact from '@preact/preset-vite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { type ConfigEnv, defineConfig, loadEnv, type Plugin, type UserConfig } from 'vite'
import { coopCoep } from 'vite-plugin-coop-coep'
import { openInEditor } from 'vite-plugin-open-in-editor'

function copyWasm(): Plugin {
  return {
    name: 'copy-wasm',
    writeBundle() {
      const wasmSource = path.resolve('node_modules/engine/as/build/index.wasm')
      const wasmSourceMobile = path.resolve('node_modules/engine/as/build/index-mobile.wasm')
      const wasmDest = path.resolve('dist/as/build/index.wasm')
      const wasmDestMobile = path.resolve('dist/as/build/index-mobile.wasm')
      const mapSource = path.resolve('node_modules/engine/as/build/index.wasm.map')
      const mapSourceMobile = path.resolve('node_modules/engine/as/build/index-mobile.wasm.map')
      const mapDest = path.resolve('dist/as/build/index.wasm.map')
      const mapDestMobile = path.resolve('dist/as/build/index-mobile.wasm.map')

      if (fs.existsSync(wasmSource)) {
        fs.mkdirSync(path.dirname(wasmDest), { recursive: true })
        fs.copyFileSync(wasmSource, wasmDest)
      }

      if (fs.existsSync(mapSource)) {
        fs.mkdirSync(path.dirname(mapDest), { recursive: true })
        fs.copyFileSync(mapSource, mapDest)
      }

      if (fs.existsSync(wasmSourceMobile)) {
        fs.mkdirSync(path.dirname(wasmDestMobile), { recursive: true })
        fs.copyFileSync(wasmSourceMobile, wasmDestMobile)
      }

      if (fs.existsSync(mapSourceMobile)) {
        fs.mkdirSync(path.dirname(mapDestMobile), { recursive: true })
        fs.copyFileSync(mapSourceMobile, mapDestMobile)
      }
    },
  }
}

// https://vite.dev/config/
export default ({ mode }: ConfigEnv): UserConfig => {
  const dirname = process.cwd()
  const env = loadEnv(mode, dirname)
  Object.assign(process.env, env)

  return defineConfig({
    root: '.',
    clearScreen: false,
    plugins: [
      preact({
        exclude: [
          '**/as/assembly/constants.ts',
          '**/src/lib/**',
          '**/src/audio-vm.ts',
          '**/utils/**',
        ],
      }),
      openInEditor({ cmd: 'cursor' }),
      coopCoep(),
      ...(mode === 'production'
        ? [
          copyWasm(),
        ]
        : []),
    ],
    optimizeDeps: {
      exclude: [
        'engine',
        'utils/mouse-buttons',
      ],
    },
    resolve: {
      alias: {
        '/as': '/node_modules/engine/as',
        'react': 'preact/compat',
        'react-dom': 'preact/compat',
        'react/jsx-runtime': 'preact/jsx-runtime',
        'wavefft': '/vendor/WaveFFT/WaveFFT.js',
      },
      dedupe: [
        '@preact/signals',
        '@preact/signals-core',
        'preact',
        'preact/hooks',
        'preact/jsx-runtime',
      ],
    },
    server: {
      host: '0.0.0.0',
      hmr: {
        host: 'localhost',
      },
      https: {
        key: fs.readFileSync(
          path.resolve(__dirname, os.homedir(), '.ssl-certs/localhost-key.pem'),
        ),
        cert: fs.readFileSync(path.resolve(__dirname, os.homedir(), '.ssl-certs/localhost.pem')),
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
        '/mespeak': {
          target: 'http://localhost:3030',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/mespeak/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      minify: false,
      sourcemap: true,
    },
  })
}
