import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { EnrollmentsService } from './enrollments.service'
import { EnrollmentsController } from './enrollments.controller'
import { CoursesModule } from '../courses/courses.module'
import { PromoCodesModule } from '../promo-codes/promo-codes.module'
import { ProgressModule } from '../progress/progress.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([EnrollmentEntity]),
    CoursesModule,
    PromoCodesModule,
    forwardRef(() => ProgressModule),
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
