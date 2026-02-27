import { signal } from '@preact/signals-core'

export function arraySignal<T>(initialValue: T[]) {
  const array = signal(initialValue)
  return {
    get value() {
      return array.value
    },
    set value(v: T[]) {
      if (v.length !== array.value.length) {
        array.value = v
        return
      }
      for (let i = 0; i < v.length; i++) {
        const next = v[i]
        const curr = array.value[i]
        if (next !== curr) {
          array.value = v
          return
        }
      }
    },
  }
}
