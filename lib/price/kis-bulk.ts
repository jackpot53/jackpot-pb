/**
 * KIS REST 호출 일괄 실행 헬퍼.
 * 슬라이딩 윈도우 방식으로 동시성을 제한해 KIS 개인계정 20 req/sec 한도 내에서 운영.
 * 단건 실패가 다른 작업을 막지 않도록 PromiseSettledResult 형태로 결과 반환.
 */

export type KisBatchOptions = {
  concurrency?: number
}

const DEFAULT_CONCURRENCY = 8

export async function runKisBatched<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
  options: KisBatchOptions = {},
): Promise<PromiseSettledResult<R>[]> {
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY)
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let cursor = 0

  async function pump() {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      try {
        results[i] = { status: 'fulfilled', value: await worker(items[i], i) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => pump(),
  )
  await Promise.all(workers)
  return results
}
