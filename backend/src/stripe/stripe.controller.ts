import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../common/current-user.decorator'
import { StripeService } from './stripe.service'

class CheckoutDto {
  @IsString()
  @MinLength(1)
  courseId: string
}

@Controller('stripe')
@UseGuards(AuthGuard('jwt'))
export class StripeController {
  constructor(private readonly stripe: StripeService) {}

  @Post('checkout')
  checkout(
    @CurrentUser() u: { id: string; email: string },
    @Body() body: CheckoutDto,
  ) {
    const base = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    return this.stripe.createCheckoutSession({
      courseId: body.courseId,
      userId: u.id,
      email: u.email,
      successUrl: `${base}/my-courses`,
      cancelUrl: `${base}/courses`,
    })
  }
}
