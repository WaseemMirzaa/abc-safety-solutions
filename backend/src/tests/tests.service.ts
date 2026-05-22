import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { Repository } from 'typeorm'
import { CourseTestEntity, TestQuestion } from '../entities/course-test.entity'
import { ProgressService } from '../progress/progress.service'
import { EnrollmentsService } from '../enrollments/enrollments.service'
import { TestAttemptsService } from '../test-attempts/test-attempts.service'

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(CourseTestEntity)
    private readonly tests: Repository<CourseTestEntity>,
    private readonly progress: ProgressService,
    private readonly enrollments: EnrollmentsService,
    private readonly testAttempts: TestAttemptsService,
  ) {}

  async publishedForCourse(courseId: string): Promise<CourseTestEntity | null> {
    const list = await this.tests.find({
      where: { courseId, published: true },
      order: { updatedAt: 'DESC' },
    })
    const t = list.find((x) => x.questions?.length > 0)
    return t ?? null
  }

  adminList() {
    return this.tests.find({ order: { updatedAt: 'DESC' } })
  }

  adminUpsert(row: Partial<CourseTestEntity>) {
    return this.tests.save(this.tests.create(row))
  }

  adminDelete(id: string) {
    return this.tests.delete({ id })
  }

  score(test: CourseTestEntity, answers: Record<string, string>) {
    if (!test.questions.length) return 0
    let correct = 0
    for (const q of test.questions) {
      const pick = answers[q.id]
      if (q.options.some((o) => o.id === pick && o.isCorrect)) correct++
    }
    return Math.round((100 * correct) / test.questions.length)
  }

  async submit(userId: string, courseId: string, answers: Record<string, string>, timedOut = false) {
    const test = await this.publishedForCourse(courseId)
    if (!test) throw new NotFoundException('No published test')
    const enrollment = await this.enrollments.assertEnrolled(userId, courseId)
    if (enrollment.attemptsExhausted || (enrollment.testAttemptsRemaining ?? 0) <= 0) {
      throw new BadRequestException(
        'No test attempts remaining. Repurchase this course to unlock more attempts.',
      )
    }
    const prog = await this.progress.get(userId, courseId)
    if (!prog.completedSlides) {
      throw new BadRequestException('Complete all course slides before taking the knowledge check.')
    }
    if (!timedOut) {
      const missing = test.questions.filter((q) => !answers[q.id]?.trim())
      if (missing.length > 0) {
        throw new BadRequestException('Answer every question before submitting.')
      }
    }
    const pct = this.score(test, answers)
    const passed = pct >= test.passPercent
    const priorAttempts = await this.testAttempts.findForUserCourse(userId, courseId)
    const attemptNumber = priorAttempts.length + 1
    await this.testAttempts.record({
      userId,
      courseId,
      enrollmentId: enrollment.id,
      attemptNumber,
      scorePercent: pct,
      passPercent: test.passPercent,
      passed,
      timedOut,
    })
    if (passed) {
      await this.progress.setTestPassed(userId, courseId, true)
    } else {
      enrollment.testAttemptsRemaining = Math.max(0, (enrollment.testAttemptsRemaining ?? 3) - 1)
      if (enrollment.testAttemptsRemaining <= 0) {
        enrollment.attemptsExhausted = true
      }
      await this.enrollments.saveEnrollment(enrollment)
      await this.progress.requireContentReview(userId, courseId)
    }
    return {
      passPercent: test.passPercent,
      scorePercent: pct,
      passed,
      timedOut,
      attemptsRemaining: enrollment.testAttemptsRemaining ?? 0,
      attemptsExhausted: Boolean(enrollment.attemptsExhausted),
    }
  }

  async submitNoTestPass(userId: string, courseId: string, passed: boolean) {
    const test = await this.publishedForCourse(courseId)
    if (test) throw new BadRequestException('Use /tests/submit for this course')
    if (passed) {
      await this.progress.setTestPassed(userId, courseId, true)
    } else {
      await this.progress.requireContentReview(userId, courseId)
    }
    return { passed }
  }
}
