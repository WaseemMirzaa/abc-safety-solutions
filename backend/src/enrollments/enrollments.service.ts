import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { In, Repository } from 'typeorm'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { CoursesService } from '../courses/courses.service'
import { PromoCodesService } from '../promo-codes/promo-codes.service'
import { computeCheckoutPricing } from '../common/pricing.util'
import type { EnrollmentPricingSnapshot } from './enrollment-pricing.types'

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
    private readonly promoCodes: PromoCodesService,
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
    if (isStripePaidOrderId(enrollment.orderId)) return true
    return enrollment.orderId.startsWith('disc_')
  }

  async enrollDirect(userId: string, courseId: string) {
    const course = await this.courses.findEntity(courseId)
    if (!course || !course.published) throw new NotFoundException('Course not found')
    if (course.priceCents > 0) {
      throw new BadRequestException('Payment required. Complete Stripe checkout before accessing this course.')
    }
    const list = course.priceCents
    const pricing: EnrollmentPricingSnapshot = {
      listPriceCents: list,
      amountPaidCents: 0,
      courseDiscountPercent: course.discountPercent ?? 0,
      promoCode: null,
      promoDiscountPercent: 0,
    }
    return this.enrollFromOrder(userId, courseId, `free_${Date.now()}`, pricing)
  }

  /** Paid course reduced to $0 via course + promo discounts (no Stripe). */
  async enrollDiscountedFree(userId: string, courseId: string, promoCodeRaw?: string) {
    const course = await this.courses.findEntity(courseId)
    if (!course || !course.published) throw new NotFoundException('Course not found')
    if (course.priceCents < 1) {
      return this.enrollDirect(userId, courseId)
    }

    let promoDiscountPercent = 0
    let promoCode: string | null = null
    if (promoCodeRaw?.trim()) {
      const promo = await this.promoCodes.resolveForCheckout(promoCodeRaw)
      promoDiscountPercent = promo.discountPercent
      promoCode = promo.code
    }

    const computed = computeCheckoutPricing({
      listPriceCents: course.priceCents,
      courseDiscountPercent: course.discountPercent ?? 0,
      promoDiscountPercent,
      promoCode,
    })

    if (computed.amountCents > 0) {
      throw new BadRequestException('Payment is still required for this course. Complete checkout.')
    }

    const pricing: EnrollmentPricingSnapshot = {
      listPriceCents: computed.listPriceCents,
      amountPaidCents: 0,
      courseDiscountPercent: computed.courseDiscountPercent,
      promoCode: computed.promoCode,
      promoDiscountPercent: computed.promoDiscountPercent,
    }

    const row = await this.enrollFromOrder(userId, courseId, `disc_${Date.now()}`, pricing)
    if (pricing.promoCode) {
      await this.promoCodes.recordRedemption(pricing.promoCode)
    }
    return row
  }

  private applyPricingSnapshot(row: EnrollmentEntity, pricing?: EnrollmentPricingSnapshot) {
    if (!pricing) return
    row.listPriceCents = pricing.listPriceCents
    row.amountPaidCents = pricing.amountPaidCents
    row.courseDiscountPercent = pricing.courseDiscountPercent
    row.promoCode = pricing.promoCode
    row.promoDiscountPercent = pricing.promoDiscountPercent
  }

  /** Idempotent enrollment after Stripe checkout or webhook. */
  async enrollFromOrder(
    userId: string,
    courseId: string,
    orderId: string,
    pricing?: EnrollmentPricingSnapshot,
  ) {
    const exists = await this.enrollments.findOne({ where: { userId, courseId } })
    if (exists) {
      if (exists.refunded) exists.refunded = false
      // Upgrade legacy/demo order ids when Stripe checkout completes.
      if (isStripePaidOrderId(orderId) && exists.orderId !== orderId) {
        exists.orderId = orderId
        exists.purchasedAt = new Date()
        this.applyPricingSnapshot(exists, pricing)
        return this.enrollments.save(exists)
      }
      if (isStripePaidOrderId(orderId) && !isStripePaidOrderId(exists.orderId)) {
        exists.orderId = orderId
        exists.purchasedAt = new Date()
        this.applyPricingSnapshot(exists, pricing)
        return this.enrollments.save(exists)
      }
      if (!exists.refunded) {
        if (pricing) this.applyPricingSnapshot(exists, pricing)
        return exists
      }
      exists.orderId = orderId
      exists.purchasedAt = new Date()
      this.applyPricingSnapshot(exists, pricing)
      return this.enrollments.save(exists)
    }
    const row = this.enrollments.create({
      id: randomUUID(),
      userId,
      courseId,
      orderId,
      refunded: false,
      listPriceCents: pricing?.listPriceCents ?? null,
      amountPaidCents: pricing?.amountPaidCents ?? null,
      courseDiscountPercent: pricing?.courseDiscountPercent ?? 0,
      promoCode: pricing?.promoCode ?? null,
      promoDiscountPercent: pricing?.promoDiscountPercent ?? 0,
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
