import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null
  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY', '')
    this.stripe = key ? new Stripe(key) : null
  }

  enabled() {
    return this.config.get<string>('STRIPE_ENABLED', 'false') === 'true'
  }

  async createCheckoutSession(params: { courseId: string; userId: string; email: string; successUrl: string; cancelUrl: string }) {
    if (!this.enabled()) {
      throw new BadRequestException('Stripe checkout is not configured. Contact the administrator.')
    }
    if (!this.stripe) throw new BadRequestException('Stripe secret not configured')
    // Placeholder: real implementation would create Checkout Session with price_data from course
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: params.email,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      line_items: [{ price_data: { currency: 'usd', product_data: { name: `Course ${params.courseId}` }, unit_amount: 2999 }, quantity: 1 }],
      metadata: { courseId: params.courseId, userId: params.userId },
    })
    return { url: session.url }
  }
}
