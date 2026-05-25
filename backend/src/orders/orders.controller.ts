import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { OrdersService } from './orders.service'

@Controller('admin/orders')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.orders.list({ search, fromDate, toDate })
  }

  @Post(':orderId/toggle-refund')
  toggle(@Param('orderId') orderId: string) {
    return this.orders.toggleRefund(orderId)
  }
}
