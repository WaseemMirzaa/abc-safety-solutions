import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

export type ConversionStatus = 'converting' | 'done' | 'error'

export interface ConversionJob {
  id: string
  status: ConversionStatus
  progress: number
  url?: string
  durationSec?: number
  error?: string
  createdAt: number
}

@Injectable()
export class ConversionJobService {
  private readonly jobs = new Map<string, ConversionJob>()

  create(): ConversionJob {
    const job: ConversionJob = { id: randomUUID(), status: 'converting', progress: 0, createdAt: Date.now() }
    this.jobs.set(job.id, job)
    // prune entries older than 2 hours
    const cutoff = Date.now() - 7_200_000
    for (const [k, v] of this.jobs) if (v.createdAt < cutoff) this.jobs.delete(k)
    return job
  }

  get(id: string): ConversionJob | undefined {
    return this.jobs.get(id)
  }

  update(id: string, patch: Partial<Omit<ConversionJob, 'id' | 'createdAt'>>) {
    const j = this.jobs.get(id)
    if (j) Object.assign(j, patch)
  }
}
