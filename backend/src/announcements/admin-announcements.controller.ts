import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { AnnouncementsService } from './announcements.service'
import { AdminAnnouncementDto } from './dto/admin-announcement.dto'

@Controller('admin/announcements')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminAnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list() {
    return this.announcements.list()
  }

  @Post()
  upsert(@Body() body: AdminAnnouncementDto) {
    return this.announcements.save(body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcements.delete(id)
  }
}
