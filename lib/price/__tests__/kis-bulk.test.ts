import { describe, it, expect, vi } from 'vitest'
import { runKisBatched } from '../kis-bulk'

describe('runKisBatched', () => {
  it('returns results in original order', async () => {
    const items = [10, 20, 30, 40, 50]
    const settled = await runKisBatched(items, async (n) => n * 2, { concurrency: 2 })
    expect(settled.map((r) => r.status === 'fulfilled' ? r.value : null)).toEqual([20, 40, 60, 80, 100])
  })

  it('respects concurrency limit', async () => {
    const inFlight = { current: 0, max: 0 }
    const tasks = Array.from({ length: 20 }, (_, i) => i)

    await runKisBatched(
      tasks,
      async () => {
        inFlight.current++
        if (inFlight.current > inFlight.max) inFlight.max = inFlight.current
        await new Promise((resolve) => setTimeout(resolve, 5))
        inFlight.current--
        return 1
      },
      { concurrency: 4 },
    )

    expect(inFlight.max).toBeLessThanOrEqual(4)
    expect(inFlight.max).toBeGreaterThan(1) // proves parallelism
  })

  it('isolates individual rejections — peers continue', async () => {
    const settled = await runKisBatched(
      [1, 2, 3, 4, 5],
      async (n) => {
        if (n === 3) throw new Error('boom')
        return n
      },
      { concurrency: 3 },
    )

    expect(settled[2].status).toBe('rejected')
    expect(settled.filter((r) => r.status === 'fulfilled')).toHaveLength(4)
  })

  it('handles empty input', async () => {
    const settled = await runKisBatched([], async () => 1)
    expect(settled).toEqual([])
  })

  it('passes index to worker', async () => {
    const worker = vi.fn(async (_item: string, i: number) => i)
    await runKisBatched(['a', 'b', 'c'], worker, { concurrency: 1 })
    expect(worker).toHaveBeenCalledWith('a', 0)
    expect(worker).toHaveBeenCalledWith('b', 1)
    expect(worker).toHaveBeenCalledWith('c', 2)
  })

  it('clamps concurrency to at least 1', async () => {
    const settled = await runKisBatched([1, 2], async (n) => n, { concurrency: 0 })
    expect(settled.map((r) => r.status === 'fulfilled' ? r.value : null)).toEqual([1, 2])
  })
})
