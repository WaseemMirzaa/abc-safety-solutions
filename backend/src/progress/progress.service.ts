import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { Repository } from 'typeorm'
import { ProgressEntity } from '../entities/progress.entity'
import { EnrollmentsService } from '../enrollments/enrollments.service'

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(ProgressEntity)
    private readonly progress: Repository<ProgressEntity>,
    private readonly enrollments: EnrollmentsService,
  ) {}

  async get(userId: string, courseId: string) {
    await this.enrollments.assertEnrolled(userId, courseId)
    let row = await this.progress.findOne({ where: { userId, courseId } })
    if (!row) {
      row = this.progress.create({
        id: randomUUID(),
        userId,
        courseId,
        slideIndex: 0,
        audioTimeSec: 0,
        completedSlides: false,
        testPassed: false,
      })
      await this.progress.save(row)
    }
    return row
  }

  async save(
    userId: string,
    courseId: string,
    body: { slideIndex: number; audioTimeSec: number; completedSlides: boolean },
  ) {
    const row = await this.get(userId, courseId)
    row.slideIndex = body.slideIndex
    row.audioTimeSec = body.audioTimeSec
    row.completedSlides = body.completedSlides
    return this.progress.save(row)
  }

  async setTestPassed(userId: string, courseId: string, passed: boolean) {
    const row = await this.get(userId, courseId)
    row.testPassed = passed
    return this.progress.save(row)
  }

  /** After a failed knowledge check, learner must review all slides again. */
  async requireContentReview(userId: string, courseId: string) {
    const row = await this.get(userId, courseId)
    row.completedSlides = false
    row.testPassed = false
    row.slideIndex = 0
    row.audioTimeSec = 0
    return this.progress.save(row)
  }
}
