import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CurrentUser } from '../common/current-user.decorator'
import { OrdersService } from './orders.service'
import { StripeService } from '../stripe/stripe.service'

@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class MeOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly stripe: StripeService,
  ) {}

  @Get('orders')
  async myOrders(@CurrentUser() u: { id: string }) {
    const rows = await this.orders.listForUser(u.id)
    return this.stripe.enrichOrderRows(u.id, rows)
  }
}
