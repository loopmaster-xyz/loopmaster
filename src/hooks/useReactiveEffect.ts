import { effect } from '@preact/signals'
import { useLayoutEffect } from 'preact/hooks'

/**
 * Runs a reactive effect scoped to the component lifecycle.
 * Automatically disposes on unmount.
 */
export function useReactiveEffect(fn: () => void, deps: unknown[] = []) {
  useLayoutEffect(() => effect(fn), deps)
}
