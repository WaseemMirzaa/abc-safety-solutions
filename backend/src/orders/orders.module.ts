import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { CourseEntity } from '../entities/course.entity'
import { CertificateEntity } from '../entities/certificate.entity'
import { OrdersService } from './orders.service'
import { OrdersController } from './orders.controller'
import { AdminStatsController } from './admin-stats.controller'
import { MeOrdersController } from './me-orders.controller'

@Module({
  imports: [TypeOrmModule.forFeature([EnrollmentEntity, CourseEntity, CertificateEntity])],
  controllers: [OrdersController, AdminStatsController, MeOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
