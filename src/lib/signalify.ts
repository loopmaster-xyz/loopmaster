import { computed, signal } from '@preact/signals-core'

const signalified = new WeakSet<any>()

export function signalify<T>(value: T): T {
  if (signalified.has(value)) return value

  const descs = Object.getOwnPropertyDescriptors(value)
  const state = value
  signalified.add(state)

  for (const [key, desc] of Object.entries(descs)) {
    if (desc.get) {
      const s = computed(desc.get.bind(state))
      Object.defineProperty(state, key, {
        get: () => s.value,
        set: desc.set?.bind(state),
        configurable: false,
        enumerable: true,
      })
    }
    else {
      const s = signal(desc.value)
      Object.defineProperty(state, key, {
        get: () => s.value,
        set: value => s.value = value,
        configurable: false,
        enumerable: true,
      })
    }
  }

  return state as T
}
