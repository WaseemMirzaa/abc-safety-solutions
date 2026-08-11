/** Generic retry-with-backoff helper. Mirrors frontend/src/lib/retry.ts so both
 *  layers share the same shape and behaviour for "retry on transient failure". */

export type RetryOptions = {
  attempts?: number
  delayMs?: number
  backoff?: boolean
  shouldRetry?: (error: unknown, attempt: number) => boolean
  onRetry?: (error: unknown, attempt: number) => void
}

/** True for network hiccups, timeouts, and 429/5xx — the classes of failure a retry can fix. */
export function isTransientError(error: unknown): boolean {
  const status =
    (error as { status?: number })?.status ??
    (error as { statusCode?: number })?.statusCode
  if (typeof status === 'number') {
    if (status === 429) return true
    if (status >= 500) return true
    return false
  }
  if (error instanceof Error) {
    if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network|timeout|fetch failed/i.test(error.message)) {
      return true
    }
  }
  // Unknown shape (e.g. SDK wrapped error without a status) — retry cautiously.
  return true
}

export async function withRetries<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 4)
  const baseDelay = options.delayMs ?? 1000
  const shouldRetry = options.shouldRetry ?? isTransientError
  let last: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      const isLastAttempt = attempt >= attempts - 1
      if (isLastAttempt || !shouldRetry(e, attempt)) break
      options.onRetry?.(e, attempt)
      const jitter = Math.random() * 250
      const delay = (options.backoff === false ? baseDelay : baseDelay * 2 ** attempt) + jitter
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw last
}
