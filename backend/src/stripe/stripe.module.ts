import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from '../entities/user.entity'
import { CoursesModule } from '../courses/courses.module'
import { EnrollmentsModule } from '../enrollments/enrollments.module'
import { StripeService } from './stripe.service'
import { StripeController } from './stripe.controller'
import { StripeWebhookController } from './stripe-webhook.controller'

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), CoursesModule, EnrollmentsModule],
  controllers: [StripeController, StripeWebhookController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
