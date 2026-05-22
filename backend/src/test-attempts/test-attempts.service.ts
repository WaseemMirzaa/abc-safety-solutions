import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { Repository } from 'typeorm'
import { TestAttemptEntity } from '../entities/test-attempt.entity'

@Injectable()
export class TestAttemptsService {
  constructor(
    @InjectRepository(TestAttemptEntity)
    private readonly attempts: Repository<TestAttemptEntity>,
  ) {}

  async record(params: {
    userId: string
    courseId: string
    enrollmentId: string
    attemptNumber: number
    scorePercent: number
    passPercent: number
    passed: boolean
    timedOut: boolean
  }) {
    const row = this.attempts.create({
      id: randomUUID(),
      ...params,
    })
    return this.attempts.save(row)
  }

  findForUserCourse(userId: string, courseId: string) {
    return this.attempts.find({
      where: { userId, courseId },
      order: { submittedAt: 'ASC' },
    })
  }

  findForUser(userId: string) {
    return this.attempts.find({
      where: { userId },
      order: { submittedAt: 'DESC' },
    })
  }

  countFails(userId: string, courseId: string) {
    return this.attempts.count({
      where: { userId, courseId, passed: false },
    })
  }
}
