import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { CourseEntity } from '../entities/course.entity'

export type OrderRow = {
  orderId: string
  purchasedAt: string
  courseId: string
  courseTitle: string
  amountCents: number
  refunded: boolean
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
  ) {}

  private async toOrderRows(list: EnrollmentEntity[]): Promise<OrderRow[]> {
    const byCourse = new Map((await this.courses.find()).map((c) => [c.id, c]))
    return list.map((e) => ({
      orderId: e.orderId,
      purchasedAt: e.purchasedAt.toISOString(),
      courseId: e.courseId,
      courseTitle: byCourse.get(e.courseId)?.title ?? e.courseId,
      amountCents: byCourse.get(e.courseId)?.priceCents ?? 0,
      refunded: e.refunded,
    }))
  }

  async list(): Promise<OrderRow[]> {
    const list = await this.enrollments.find({ order: { purchasedAt: 'DESC' } })
    return this.toOrderRows(list)
  }

  async listForUser(userId: string): Promise<OrderRow[]> {
    const list = await this.enrollments.find({ where: { userId }, order: { purchasedAt: 'DESC' } })
    return this.toOrderRows(list)
  }

  async toggleRefund(orderId: string) {
    const e = await this.enrollments.findOne({ where: { orderId } })
    if (!e) return { ok: false }
    e.refunded = !e.refunded
    await this.enrollments.save(e)
    return { ok: true, refunded: e.refunded }
  }
}
