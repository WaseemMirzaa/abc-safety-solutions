import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CertificateEntity } from '../entities/certificate.entity'
import { CourseEntity } from '../entities/course.entity'
import { CategoryEntity } from '../entities/category.entity'
import { ProgressEntity } from '../entities/progress.entity'
import { CourseTestEntity } from '../entities/course-test.entity'
import { CertificatesService } from './certificates.service'
import { CertificatesController } from './certificates.controller'
import { PublicCertificatesController } from './public-certificates.controller'
import { EnrollmentsModule } from '../enrollments/enrollments.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { CertificateExpiryNotifierService } from './certificate-expiry-notifier.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([CertificateEntity, CourseEntity, CategoryEntity, ProgressEntity, CourseTestEntity]),
    EnrollmentsModule,
    NotificationsModule,
  ],
  controllers: [CertificatesController, PublicCertificatesController],
  providers: [CertificatesService, CertificateExpiryNotifierService],
})
export class CertificatesModule {}
