import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnnouncementEntity } from '../entities/announcement.entity'
import { AnnouncementsService } from './announcements.service'
import { AdminAnnouncementsController } from './admin-announcements.controller'

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEntity])],
  controllers: [AdminAnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
