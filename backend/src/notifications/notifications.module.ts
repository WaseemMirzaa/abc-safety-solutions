import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { NotificationEntity } from '../entities/notification.entity'
import { DeviceTokenEntity } from '../entities/device-token.entity'
import { UserEntity } from '../entities/user.entity'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationsPushService } from './notifications-push.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, DeviceTokenEntity, UserEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-me'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, NotificationsPushService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
