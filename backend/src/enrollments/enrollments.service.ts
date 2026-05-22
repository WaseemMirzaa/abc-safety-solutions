import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { In, Repository } from 'typeorm'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { CoursesService } from '../courses/courses.service'

/** Stripe Checkout session ids (paid access for priced courses). */
export function isStripePaidOrderId(orderId: string): boolean {
  return orderId.startsWith('cs_')
}

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
    return list.map((e) => {
      const course = byId.get(e.courseId) ?? null
      return {
        id: e.id,
        userId: e.userId,
        courseId: e.courseId,
        orderId: e.orderId,
        refunded: e.refunded,
        purchasedAt: e.purchasedAt.toISOString(),
        hasAccess: this.hasAccessFor(e, course?.priceCents ?? 0),
        course,
      }
    })
  }

  hasAccessFor(enrollment: Pick<EnrollmentEntity, 'refunded' | 'orderId'>, priceCents: number): boolean {
    if (enrollment.refunded) return false
    if (priceCents < 1) return true
    return isStripePaidOrderId(enrollment.orderId)
  }

  async enrollDirect(userId: string, courseId: string) {
    const course = await this.courses.findEntity(courseId)
    if (!course || !course.published) throw new NotFoundException('Course not found')
    if (course.priceCents > 0) {
      throw new BadRequestException('Payment required. Complete Stripe checkout before accessing this course.')
    }
    return this.enrollFromOrder(userId, courseId, `free_${Date.now()}`)
  }

  /** Idempotent enrollment after Stripe checkout or webhook. */
  async enrollFromOrder(userId: string, courseId: string, orderId: string) {
    const exists = await this.enrollments.findOne({ where: { userId, courseId } })
    if (exists) {
      if (exists.refunded) exists.refunded = false
      // Upgrade legacy/demo order ids when Stripe checkout completes.
      if (isStripePaidOrderId(orderId) && exists.orderId !== orderId) {
        exists.orderId = orderId
        exists.purchasedAt = new Date()
        return this.enrollments.save(exists)
      }
      if (isStripePaidOrderId(orderId) && !isStripePaidOrderId(exists.orderId)) {
        exists.orderId = orderId
        exists.purchasedAt = new Date()
        return this.enrollments.save(exists)
      }
      if (!exists.refunded) return exists
      exists.orderId = orderId
      exists.purchasedAt = new Date()
      return this.enrollments.save(exists)
    }
    const row = this.enrollments.create({
      id: randomUUID(),
      userId,
      courseId,
      orderId,
      refunded: false,
    })
    return this.enrollments.save(row)
  }

  async assertEnrolled(userId: string, courseId: string) {
    const e = await this.enrollments.findOne({ where: { userId, courseId, refunded: false } })
    if (!e) throw new ForbiddenException('Not enrolled')
    const course = await this.courses.findEntity(courseId)
    if (course && course.priceCents > 0 && !this.hasAccessFor(e, course.priceCents)) {
      throw new ForbiddenException('Payment required to access this course')
    }
    return e
  }
}
