import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { CourseEntity } from '../entities/course.entity'
import { isStripePaidOrderId } from '../enrollments/enrollments.service'
import { StripeService } from '../stripe/stripe.service'

export type OrderRow = {
  orderId: string
  purchasedAt: string
  courseId: string
  courseTitle: string
  amountCents: number
  refunded: boolean
}

export type RefundOrderResult = {
  ok: boolean
  refunded: boolean
  stripeRefundId?: string | null
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    private readonly stripe: StripeService,
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

  async toggleRefund(orderId: string): Promise<RefundOrderResult> {
    const e = await this.enrollments.findOne({ where: { orderId } })
    if (!e) throw new NotFoundException('Order not found')

    if (e.refunded) {
      if (isStripePaidOrderId(orderId)) {
        throw new BadRequestException(
          'This order was refunded in Stripe. Reversing access requires a new purchase; use support tools in Stripe Dashboard if needed.',
        )
      }
      e.refunded = false
      await this.enrollments.save(e)
      return { ok: true, refunded: false }
    }

    let stripeRefundId: string | null = null
    if (isStripePaidOrderId(orderId)) {
      if (!this.stripe.enabled()) {
        throw new BadRequestException('Stripe is not configured; cannot refund payment.')
      }
      const result = await this.stripe.refundCheckoutSession(orderId)
      stripeRefundId = result.refundId
    }

    e.refunded = true
    await this.enrollments.save(e)
    return { ok: true, refunded: true, stripeRefundId }
  }
}
