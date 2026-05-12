import { ForbiddenException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { In, Repository } from 'typeorm'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { CoursesService } from '../courses/courses.service'

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
    private readonly courses: CoursesService,
  ) {}

  async my(userId: string) {
    const list = await this.enrollments.find({ where: { userId }, order: { purchasedAt: 'DESC' } })
    if (!list.length) return []
    const ids = [...new Set(list.map((e) => e.courseId))]
    const courseRows = await this.courses.findEntitiesByIds(ids)
    const byId = new Map(courseRows.map((c) => [c.id, this.courses.toDto(c)]))
    return list.map((e) => ({
      id: e.id,
      userId: e.userId,
      courseId: e.courseId,
      orderId: e.orderId,
      refunded: e.refunded,
      purchasedAt: e.purchasedAt.toISOString(),
      course: byId.get(e.courseId) ?? null,
    }))
  }

  async enrollDirect(userId: string, courseId: string) {
    const exists = await this.enrollments.findOne({ where: { userId, courseId } })
    if (exists) return exists
    const row = this.enrollments.create({
      id: randomUUID(),
      userId,
      courseId,
      orderId: `order_${Date.now()}`,
      refunded: false,
    })
    return this.enrollments.save(row)
  }

  async assertEnrolled(userId: string, courseId: string) {
    const e = await this.enrollments.findOne({ where: { userId, courseId, refunded: false } })
    if (!e) throw new ForbiddenException('Not enrolled')
    return e
  }
}
