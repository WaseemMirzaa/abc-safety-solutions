import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import Stripe from 'stripe'
import { UserEntity } from '../entities/user.entity'
import { CoursesService } from '../courses/courses.service'
import { EnrollmentsService, isStripePaidOrderId } from '../enrollments/enrollments.service'
import type { CheckoutBillingLinks, CheckoutConfirmation, EnrichedOrderRow } from './checkout-confirmation.types'
import type { OrderRow } from '../orders/orders.service'

@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly courses: CoursesService,
    private readonly enrollments: EnrollmentsService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY', '')
    this.stripe = key ? new Stripe(key) : null
  }

  /** True only when flag is on AND secret key is present. */
  enabled() {
    return (
      this.config.get<string>('STRIPE_ENABLED', 'false') === 'true' &&
      Boolean(this.config.get<string>('STRIPE_SECRET_KEY', '')?.trim())
    )
  }

  private client(): Stripe {
    if (!this.enabled()) {
      throw new BadRequestException('Stripe checkout is not configured. Contact the administrator.')
    }
    if (!this.stripe) throw new BadRequestException('Stripe secret not configured')
    return this.stripe
  }

  async getOrCreateCustomer(user: UserEntity): Promise<string> {
    if (user.stripeCustomerId) return user.stripeCustomerId
    const customer = await this.client().customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    })
    await this.users.update({ id: user.id }, { stripeCustomerId: customer.id })
    return customer.id
  }

  async createCheckoutSession(params: { courseId: string; userId: string; email: string }) {
    const course = await this.courses.findEntity(params.courseId)
    if (!course || !course.published) throw new NotFoundException('Course not found')
    const base = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173').split(',')[0]!.trim()
    if (course.priceCents < 1) {
      throw new BadRequestException('This course is free; enroll without payment.')
    }

    const user = await this.users.findOne({ where: { id: params.userId } })
    if (!user) throw new NotFoundException('User not found')

    const customerId = await this.getOrCreateCustomer(user)
    const session = await this.client().checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      invoice_creation: { enabled: true },
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout?course=${encodeURIComponent(course.slug)}`,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: course.priceCents,
            product_data: {
              name: course.title,
              description: course.summary?.slice(0, 200) || undefined,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { courseId: params.courseId, userId: params.userId },
    })
    return { url: session.url, sessionId: session.id }
  }

  private async billingLinksForSession(sessionId: string): Promise<CheckoutBillingLinks> {
    const session = await this.client().checkout.sessions.retrieve(sessionId, {
      expand: ['invoice', 'payment_intent.latest_charge'],
    })
    let invoiceUrl: string | null = null
    let invoicePdf: string | null = null
    let receiptUrl: string | null = null

    const invoice = session.invoice
    if (invoice && typeof invoice === 'object' && !('deleted' in invoice && invoice.deleted)) {
      invoiceUrl = invoice.hosted_invoice_url ?? null
      invoicePdf = invoice.invoice_pdf ?? null
    }

    const pi = session.payment_intent
    if (pi && typeof pi === 'object' && 'latest_charge' in pi) {
      const charge = pi.latest_charge
      if (charge && typeof charge === 'object' && 'receipt_url' in charge) {
        receiptUrl = charge.receipt_url ?? null
      }
    }

    return { receiptUrl, invoiceUrl, invoicePdf }
  }

  async fulfillSession(sessionId: string, userId: string): Promise<CheckoutConfirmation> {
    const session = await this.client().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    })
    if (session.metadata?.userId !== userId) {
      throw new ForbiddenException('Checkout session does not belong to this account')
    }
    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Payment not completed yet')
    }
    const courseId = session.metadata?.courseId
    if (!courseId) throw new BadRequestException('Missing course on checkout session')

    const course = await this.courses.findEntity(courseId)
    if (!course) throw new NotFoundException('Course not found')

    await this.enrollments.enrollFromOrder(userId, courseId, session.id)

    const billing = await this.billingLinksForSession(sessionId)
    const purchasedAt = session.created
      ? new Date(session.created * 1000).toISOString()
      : new Date().toISOString()

    return {
      ok: true,
      courseId,
      order: {
        orderId: session.id,
        purchasedAt,
        amountCents: session.amount_total ?? course.priceCents,
        currency: (session.currency ?? 'usd').toUpperCase(),
      },
      course: this.courses.toDto(course),
      billing,
    }
  }

  async enrichOrderRows(_userId: string, rows: OrderRow[]): Promise<EnrichedOrderRow[]> {
    const courseIds = [...new Set(rows.map((r) => r.courseId))]
    const courses = await Promise.all(courseIds.map((id) => this.courses.findEntity(id)))
    const byCourse = new Map(courses.filter(Boolean).map((c) => [c!.id, c!]))

    return Promise.all(
      rows.map(async (row) => {
        const course = byCourse.get(row.courseId)
        const base: EnrichedOrderRow = {
          ...row,
          courseSlug: course?.slug ?? '',
          courseSummary: course?.summary ?? '',
          courseImageUrl: course?.imageUrl ?? '',
          receiptUrl: null,
          invoiceUrl: null,
          invoicePdf: null,
        }
        if (!isStripePaidOrderId(row.orderId)) return base
        try {
          const billing = await this.billingLinksForSession(row.orderId)
          return { ...base, ...billing }
        } catch {
          return base
        }
      }),
    )
  }

  handleWebhookEvent(payload: Buffer, signature: string) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '')
    if (!secret) throw new BadRequestException('Webhook secret not configured')
    return this.client().webhooks.constructEvent(payload, signature, secret)
  }

  async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId
    const courseId = session.metadata?.courseId
    if (!userId || !courseId || session.payment_status !== 'paid') return
    await this.enrollments.enrollFromOrder(userId, courseId, session.id)
  }

  /** Full refund for a Checkout session (cs_…). Idempotent if Stripe already refunded. */
  async refundCheckoutSession(sessionId: string): Promise<{ refundId: string | null }> {
    const session = await this.client().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    })
    if (session.payment_status !== 'paid') {
      throw new BadRequestException('This checkout was not paid; nothing to refund in Stripe.')
    }
    const pi = session.payment_intent
    const paymentIntentId = typeof pi === 'string' ? pi : pi?.id
    if (!paymentIntentId) {
      throw new BadRequestException('No payment intent found for this checkout session.')
    }

    const existing = await this.client().refunds.list({ payment_intent: paymentIntentId, limit: 10 })
    const done = existing.data.find((r) => r.status === 'succeeded' || r.status === 'pending')
    if (done) return { refundId: done.id }

    const refund = await this.client().refunds.create({ payment_intent: paymentIntentId })
    return { refundId: refund.id }
  }
}
