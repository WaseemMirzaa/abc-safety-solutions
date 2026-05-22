import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { AnnouncementsService } from './announcements.service'
import { AdminAnnouncementDto } from './dto/admin-announcement.dto'
import { NotificationsService } from '../notifications/notifications.service'

@Controller('admin/announcements')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminAnnouncementsController {
  constructor(
    private readonly announcements: AnnouncementsService,
    private readonly notifications: NotificationsService,
  ) {}

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

  @Post(':id/dispatch')
  async dispatch(@Param('id') id: string) {
    const list = await this.announcements.list()
    const row = list.find((a) => a.id === id)
    if (!row) return { ok: false, error: 'Not found' }
    const result = await this.notifications.broadcast(row.title, row.body, 'announcement')
    row.status = 'sent'
    row.sentAt = new Date()
    await this.announcements.save(row)
    return { ok: true, ...result }
  }
}
