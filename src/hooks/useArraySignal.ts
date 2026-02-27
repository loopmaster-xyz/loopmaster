import { useSignal } from '@preact/signals'
import { useReactiveEffect } from './useReactiveEffect.ts'

export function useArraySignal<T>(fn: () => T[] | undefined) {
  const array = useSignal<T[]>([])
  useReactiveEffect(() => {
    const result = fn()
    if (result != null) {
      arraySignal.value = result
    }
  })
  const arraySignal = {
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
  return arraySignal
}
