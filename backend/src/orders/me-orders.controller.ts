import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CurrentUser } from '../common/current-user.decorator'
import { OrdersService } from './orders.service'

@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class MeOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders')
  myOrders(@CurrentUser() u: { id: string }) {
    return this.orders.listForUser(u.id)
  }
}
