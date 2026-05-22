import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnnouncementEntity } from '../entities/announcement.entity'
import { AnnouncementsService } from './announcements.service'
import { AdminAnnouncementsController } from './admin-announcements.controller'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEntity]), NotificationsModule],
  controllers: [AdminAnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
