import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsOptional, IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../common/current-user.decorator'
import { StripeService } from './stripe.service'

class CheckoutDto {
  @IsString()
  @MinLength(1)
  courseId: string

  @IsOptional()
  @IsString()
  promoCode?: string
}

class SessionDto {
  @IsString()
  @MinLength(1)
  sessionId: string
}

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripe: StripeService) {}

  @Get('config')
  config() {
    return { enabled: this.stripe.enabled() }
  }

  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  checkout(
    @CurrentUser() u: { id: string; email: string },
    @Body() body: CheckoutDto,
  ) {
    return this.stripe.createCheckoutSession({
      courseId: body.courseId,
      userId: u.id,
      email: u.email,
      promoCode: body.promoCode,
    })
  }

  @Post('session/complete')
  @UseGuards(AuthGuard('jwt'))
  completeSession(
    @CurrentUser() u: { id: string },
    @Body() body: SessionDto,
  ) {
    return this.stripe.fulfillSession(body.sessionId, u.id)
  }
}
