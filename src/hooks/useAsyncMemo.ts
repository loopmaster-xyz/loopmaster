import { useSignal } from '@preact/signals'
import { useReactiveEffect } from './useReactiveEffect.ts'

export function useAsyncMemo<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const signal = useSignal<T | null>(null)
  useReactiveEffect(() => {
    fn().then(v => signal.value = v)
  }, deps)
  return signal
}
