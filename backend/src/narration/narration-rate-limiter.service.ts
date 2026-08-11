import { Injectable } from '@nestjs/common'

/**
 * Process-wide counting semaphore for OpenAI narration calls.
 *
 * NARRATION_CONCURRENCY bounds the number of in-flight OpenAI requests across the WHOLE
 * process, not per course — if this were scoped per-course, saving several courses back
 * to back would multiply concurrency (N courses x limit each) and risk hammering OpenAI
 * rate limits. Every text-gen and TTS call — from any course, any phase — passes through
 * `run()` here.
 */
@Injectable()
export class NarrationRateLimiterService {
  private active = 0
  private readonly queue: Array<() => void> = []

  private limit(): number {
    const n = Number(process.env.NARRATION_CONCURRENCY ?? 4)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4
  }

  private async acquire(): Promise<void> {
    if (this.active < this.limit()) {
      this.active++
      return
    }
    await new Promise<void>((resolve) => this.queue.push(resolve))
    this.active++
  }

  private release(): void {
    this.active--
    const next = this.queue.shift()
    if (next) next()
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }
}
