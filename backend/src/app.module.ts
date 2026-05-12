import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity'
import { CategoryEntity } from './entities/category.entity'
import { CourseEntity } from './entities/course.entity'
import { EnrollmentEntity } from './entities/enrollment.entity'
import { ProgressEntity } from './entities/progress.entity'
import { CertificateEntity } from './entities/certificate.entity'
import { CourseTestEntity } from './entities/course-test.entity'
import { MediaAssetEntity } from './entities/media-asset.entity'
import { AnnouncementEntity } from './entities/announcement.entity'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { CategoriesModule } from './categories/categories.module'
import { CoursesModule } from './courses/courses.module'
import { EnrollmentsModule } from './enrollments/enrollments.module'
import { ProgressModule } from './progress/progress.module'
import { CertificatesModule } from './certificates/certificates.module'
import { TestsModule } from './tests/tests.module'
import { MediaModule } from './media/media.module'
import { AnnouncementsModule } from './announcements/announcements.module'
import { OrdersModule } from './orders/orders.module'
import { UploadModule } from './upload/upload.module'
import { StripeModule } from './stripe/stripe.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', '127.0.0.1'),
        port: Number(config.get('DB_PORT', 3306)),
        username: config.get('DB_USER', 'abc'),
        password: config.get('DB_PASSWORD', 'abc_secret'),
        database: config.get('DB_NAME', 'abc_portal'),
        entities: [
          UserEntity,
          CategoryEntity,
          CourseEntity,
          EnrollmentEntity,
          ProgressEntity,
          CertificateEntity,
          CourseTestEntity,
          MediaAssetEntity,
          AnnouncementEntity,
        ],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    CoursesModule,
    EnrollmentsModule,
    ProgressModule,
    CertificatesModule,
    TestsModule,
    MediaModule,
    AnnouncementsModule,
    OrdersModule,
    UploadModule,
    StripeModule,
    HealthModule,
  ],
})
export class AppModule {}
