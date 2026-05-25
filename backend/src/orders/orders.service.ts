import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { CourseEntity } from '../entities/course.entity'
import { UserEntity } from '../entities/user.entity'
import { isStripePaidOrderId } from '../enrollments/enrollments.service'
import { StripeService } from '../stripe/stripe.service'

export type OrderRow = {
  orderId: string
  purchasedAt: string
  courseId: string
  courseTitle: string
  userId: string
  userEmail: string
  userName: string
  amountCents: number
  listPriceCents: number
  courseDiscountPercent: number
  promoCode: string | null
  promoDiscountPercent: number
  refunded: boolean
}

export type OrdersFilter = {
  search?: string
  fromDate?: string
  toDate?: string
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
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly stripe: StripeService,
  ) {}

  private async toOrderRows(list: EnrollmentEntity[]): Promise<OrderRow[]> {
    const byCourse = new Map((await this.courses.find()).map((c) => [c.id, c]))
    const byUser = new Map((await this.users.find()).map((u) => [u.id, u]))
    return list.map((e) => {
      const course = byCourse.get(e.courseId)
      const user = byUser.get(e.userId)
      const listPrice = e.listPriceCents ?? course?.priceCents ?? 0
      const paid = e.amountPaidCents ?? (isStripePaidOrderId(e.orderId) ? listPrice : 0)
      return {
        orderId: e.orderId,
        purchasedAt: e.purchasedAt.toISOString(),
        courseId: e.courseId,
        courseTitle: course?.title ?? e.courseId,
        userId: e.userId,
        userEmail: user?.email ?? '',
        userName: user?.name ?? '',
        amountCents: paid,
        listPriceCents: listPrice,
        courseDiscountPercent: e.courseDiscountPercent ?? 0,
        promoCode: e.promoCode,
        promoDiscountPercent: e.promoDiscountPercent ?? 0,
        refunded: e.refunded,
      }
    })
  }

  async list(filter?: OrdersFilter): Promise<OrderRow[]> {
    const list = await this.enrollments.find({ order: { purchasedAt: 'DESC' } })
    let rows = await this.toOrderRows(list)

    if (filter?.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.userEmail.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q) ||
          r.courseTitle.toLowerCase().includes(q),
      )
    }
    if (filter?.fromDate) {
      const from = new Date(filter.fromDate)
      rows = rows.filter((r) => new Date(r.purchasedAt) >= from)
    }
    if (filter?.toDate) {
      const to = new Date(filter.toDate)
      to.setHours(23, 59, 59, 999)
      rows = rows.filter((r) => new Date(r.purchasedAt) <= to)
    }

    return rows
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
