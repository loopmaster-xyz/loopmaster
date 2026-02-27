import { batch, effect, untracked } from '@preact/signals-core'
import { debounce } from 'utils/debounce'

const debouncedSetItem = debounce(50, (key: string, json: () => unknown) => {
  localStorage.setItem(key, JSON.stringify(json()))
})

export function persist<T extends Record<string, unknown>>(
  key: string,
  watch: () => void,
  json: () => T,
  read: (data: Partial<T>) => void,
) {
  untracked(() => batch(() => read(JSON.parse(localStorage.getItem(key) || '{}'))))
  effect(() => {
    watch()
    debouncedSetItem(key, json)
  })
}

export function persistKeyed<T extends Record<string, unknown>>(
  getKey: () => string | null,
  watch: () => void,
  json: () => T,
  read: (data: Partial<T>) => void,
) {
  let lastKey: string | null = null
  effect(() => {
    const key = getKey()
    if (key === null) return
    if (key !== lastKey) {
      lastKey = key
      untracked(() => batch(() => read(JSON.parse(localStorage.getItem(key) || '{}'))))
    }
    watch()
    debouncedSetItem(key, json)
  })
}
