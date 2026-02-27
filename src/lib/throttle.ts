export function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let lastTime = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingArgs: any[] | null = null

  const throttled = function(this: any, ...args: any[]) {
    const now = Date.now()
    const remaining = delay - (now - lastTime)

    if (remaining > 0) {
      pendingArgs = args
      if (!timer) {
        timer = setTimeout(() => {
          timer = null
          lastTime = Date.now()
          if (pendingArgs) {
            fn.apply(this, pendingArgs)
            pendingArgs = null
          }
        }, remaining)
      }
      return
    }

    lastTime = now
    fn.apply(this, args)
  }

  return throttled as T
}
