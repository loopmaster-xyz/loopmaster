import { Deferred } from 'utils/deferred'

type Task<T, U, V> = {
  context: V
  args: U
  deferred: Deferred<T>
}

interface AtomicOptions {
  dropInbetween?: boolean
}

export function atomic<T, U extends unknown[], V>(fn: (this: V, ...args: U) => Promise<T>,
  { dropInbetween = false }: AtomicOptions = {})
{
  const queue: Task<T, U, V>[] = []
  let isRunning = false

  const apply = async (task: Task<T, U, V>) => {
    try {
      const result = await fn.apply(task.context, task.args)
      task.deferred.resolve(result)
    }
    catch (error) {
      task.deferred.reject(error as Error)
    }
  }

  const drain = async () => {
    isRunning = true

    if (dropInbetween) {
      const tasks = queue.splice(0)
      const last = tasks.pop()!
      tasks.forEach(task => task.deferred.reject(new Error('Dropped')))
      await apply(last)
    }
    else {
      const first = queue.shift()!
      await apply(first)
    }

    if (queue.length) {
      drain()
    }
    else {
      isRunning = false
    }
  }

  function cb(this: V, ...args: U) {
    const context = this
    const deferred = Deferred<T>()
    const task = {
      context,
      args,
      deferred,
    }
    queue.push(task)
    if (!isRunning) drain()
    return task.deferred.promise
  }

  return cb
}
