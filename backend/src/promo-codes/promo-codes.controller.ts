import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PromoCodesService } from './promo-codes.service'
import { ValidatePromoDto } from './dto/validate-promo.dto'

@Controller('promo')
export class PromoCodesController {
  constructor(private readonly promos: PromoCodesService) {}

  @Post('validate')
  @UseGuards(AuthGuard('jwt'))
  validate(@Body() body: ValidatePromoDto) {
    return this.promos.validateForCheckout(body.code, body.courseId)
  }
}
