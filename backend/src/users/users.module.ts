import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from '../entities/user.entity'
import { EnrollmentEntity } from '../entities/enrollment.entity'
import { CertificateEntity } from '../entities/certificate.entity'
import { TestAttemptEntity } from '../entities/test-attempt.entity'
import { CourseEntity } from '../entities/course.entity'
import { UsersService } from './users.service'
import { AdminUsersController } from './admin-users.controller'
import { AdminUsersInsightsController } from './admin-users-insights.controller'
import { AdminUserInsightsService } from './admin-user-insights.service'
import { OrdersModule } from '../orders/orders.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      EnrollmentEntity,
      CertificateEntity,
      TestAttemptEntity,
      CourseEntity,
    ]),
    OrdersModule,
  ],
  controllers: [AdminUsersController, AdminUsersInsightsController],
  providers: [UsersService, AdminUserInsightsService],
})
export class UsersModule {}
