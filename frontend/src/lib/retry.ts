export type RetryOptions = {
  attempts?: number
  delayMs?: number
  backoff?: boolean
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof TypeError && /fetch|network|failed/i.test(error.message)) return true
  const status = (error as { status?: number })?.status
  if (typeof status === 'number' && (status === 0 || status >= 502)) return true
  if (error instanceof Error) {
    if (/network error|failed to load|timeout|aborted/i.test(error.message)) return true
  }
  return false
}

export async function withRetries<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3)
  const baseDelay = options.delayMs ?? 1200
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry
  let last: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      const isLast = attempt >= attempts - 1
      if (isLast || !shouldRetry(e, attempt)) break
      const delay = options.backoff ? baseDelay * (attempt + 1) : baseDelay
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw last
}
