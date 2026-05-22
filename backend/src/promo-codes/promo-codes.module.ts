import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PromoCodeEntity } from '../entities/promo-code.entity'
import { PromoCodesService } from './promo-codes.service'
import { PromoCodesController } from './promo-codes.controller'
import { AdminPromoCodesController } from './admin-promo-codes.controller'

@Module({
  imports: [TypeOrmModule.forFeature([PromoCodeEntity])],
  controllers: [PromoCodesController, AdminPromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
