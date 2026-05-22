import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { join } from 'path'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity'
import { CategoryEntity } from './entities/category.entity'
import { CourseEntity } from './entities/course.entity'
import { CourseLanguageEntity } from './entities/course-language.entity'
import { EnrollmentEntity } from './entities/enrollment.entity'
import { ProgressEntity } from './entities/progress.entity'
import { CertificateEntity } from './entities/certificate.entity'
import { CourseTestEntity } from './entities/course-test.entity'
import { MediaAssetEntity } from './entities/media-asset.entity'
import { AnnouncementEntity } from './entities/announcement.entity'
import { PromoCodeEntity } from './entities/promo-code.entity'
import { TestAttemptEntity } from './entities/test-attempt.entity'
import { NotificationEntity } from './entities/notification.entity'
import { DeviceTokenEntity } from './entities/device-token.entity'
import { NotificationsModule } from './notifications/notifications.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { CategoriesModule } from './categories/categories.module'
import { LanguagesModule } from './languages/languages.module'
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
import { PromoCodesModule } from './promo-codes/promo-codes.module'
import { HealthModule } from './health/health.module'
import { SchemaMigrationsService } from './database/schema-migrations.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '.env'), join(process.cwd(), '../.env')],
    }),
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
          CourseLanguageEntity,
          EnrollmentEntity,
          ProgressEntity,
          CertificateEntity,
          CourseTestEntity,
          MediaAssetEntity,
          AnnouncementEntity,
          PromoCodeEntity,
          TestAttemptEntity,
          NotificationEntity,
          DeviceTokenEntity,
        ],
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    LanguagesModule,
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
    PromoCodesModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [SchemaMigrationsService],
})
export class AppModule {}
