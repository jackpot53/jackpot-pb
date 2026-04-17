const ENABLED = process.env.NODE_ENV !== 'production' || process.env.PERF_LOG === '1'

export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!ENABLED) return fn()
  const start = performance.now()
  try {
    return await fn()
  } finally {
    const ms = performance.now() - start
    console.log(`[perf] ${label.padEnd(40)} ${ms.toFixed(0).padStart(5)}ms`)
  }
}

export function timedSync<T>(label: string, fn: () => T): T {
  if (!ENABLED) return fn()
  const start = performance.now()
  try {
    return fn()
  } finally {
    const ms = performance.now() - start
    if (ms > 5) console.log(`[perf] ${label.padEnd(40)} ${ms.toFixed(0).padStart(5)}ms (sync)`)
  }
}
