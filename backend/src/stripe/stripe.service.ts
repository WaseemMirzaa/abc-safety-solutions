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
import { EnrollmentsService } from '../enrollments/enrollments.service'

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

  enabled() {
    return this.config.get<string>('STRIPE_ENABLED', 'false') === 'true'
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

  async fulfillSession(sessionId: string, userId: string) {
    const session = await this.client().checkout.sessions.retrieve(sessionId)
    if (session.metadata?.userId !== userId) {
      throw new ForbiddenException('Checkout session does not belong to this account')
    }
    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Payment not completed yet')
    }
    const courseId = session.metadata?.courseId
    if (!courseId) throw new BadRequestException('Missing course on checkout session')
    await this.enrollments.enrollFromOrder(userId, courseId, session.id)
    return { ok: true, courseId }
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
}
