/** Runs `worker` over `items` with at most `limit` in flight at once.
 *  Each item's outcome is captured independently — one failure never aborts the batch,
 *  so a page that exhausts its retries doesn't block every other page from completing. */
export type ConcurrencyResult<T, R> =
  | { item: T; index: number; ok: true; value: R }
  | { item: T; index: number; ok: false; error: unknown }

export async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  limit: number,
): Promise<ConcurrencyResult<T, R>[]> {
  const results: ConcurrencyResult<T, R>[] = new Array(items.length)
  let cursor = 0
  const poolSize = Math.max(1, Math.min(limit, items.length || 1))

  async function runNext(): Promise<void> {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      const item = items[index]
      try {
        const value = await worker(item, index)
        results[index] = { item, index, ok: true, value }
      } catch (error) {
        results[index] = { item, index, ok: false, error }
      }
    }
  }

  await Promise.all(Array.from({ length: poolSize }, () => runNext()))
  return results
}
