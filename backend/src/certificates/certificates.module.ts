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

@Module({
  imports: [
    TypeOrmModule.forFeature([CertificateEntity, CourseEntity, CategoryEntity, ProgressEntity, CourseTestEntity]),
    EnrollmentsModule,
  ],
  controllers: [CertificatesController, PublicCertificatesController],
  providers: [CertificatesService],
})
export class CertificatesModule {}
