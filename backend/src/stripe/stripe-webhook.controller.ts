import { BadRequestException, Controller, Headers, Post, Req } from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import Stripe from 'stripe'
import { StripeService } from './stripe.service'

@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly stripe: StripeService) {}

  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    if (!signature) throw new BadRequestException('Missing stripe-signature')
    const raw = req.rawBody
    if (!raw?.length) throw new BadRequestException('Missing raw body')
    let event: Stripe.Event
    try {
      event = this.stripe.handleWebhookEvent(raw, signature)
    } catch {
      throw new BadRequestException('Invalid webhook signature')
    }
    if (event.type === 'checkout.session.completed') {
      await this.stripe.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
    }
    return { received: true }
  }
}
