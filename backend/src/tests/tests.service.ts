import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { Repository } from 'typeorm'
import { CourseTestEntity, TestQuestion } from '../entities/course-test.entity'
import { ProgressService } from '../progress/progress.service'

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(CourseTestEntity)
    private readonly tests: Repository<CourseTestEntity>,
    private readonly progress: ProgressService,
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

  async submit(userId: string, courseId: string, answers: Record<string, string>) {
    const test = await this.publishedForCourse(courseId)
    if (!test) throw new NotFoundException('No published test')
    const pct = this.score(test, answers)
    const passed = pct >= test.passPercent
    await this.progress.setTestPassed(userId, courseId, passed)
    return { passPercent: test.passPercent, scorePercent: pct, passed }
  }

  async submitNoTestPass(userId: string, courseId: string, passed: boolean) {
    const test = await this.publishedForCourse(courseId)
    if (test) throw new BadRequestException('Use /tests/submit for this course')
    await this.progress.setTestPassed(userId, courseId, passed)
    return { passed }
  }
}
