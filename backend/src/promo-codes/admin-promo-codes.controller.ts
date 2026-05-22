import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { PromoCodesService } from './promo-codes.service'
import { AdminPromoCodeDto } from './dto/admin-promo-code.dto'

@Controller('admin/promo-codes')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminPromoCodesController {
  constructor(private readonly promos: PromoCodesService) {}

  @Get()
  list() {
    return this.promos.listAdmin()
  }

  @Post()
  upsert(@Body() body: AdminPromoCodeDto) {
    return this.promos.upsert(body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promos.remove(id)
  }
}
