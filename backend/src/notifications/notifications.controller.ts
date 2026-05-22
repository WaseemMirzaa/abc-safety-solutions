import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator'
import { CurrentUser } from '../common/current-user.decorator'
import { NotificationsService } from './notifications.service'

class RegisterDeviceDto {
  @IsString()
  @MinLength(1)
  token: string

  @IsIn(['web', 'android', 'ios'])
  platform: 'web' | 'android' | 'ios'
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() u: { id: string }) {
    return this.notifications.listForUser(u.id)
  }

  @Patch(':id/read')
  markRead(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.notifications.markRead(u.id, id)
  }

  @Post('read-all')
  markAllRead(@CurrentUser() u: { id: string }) {
    return this.notifications.markAllRead(u.id)
  }

  @Post('device')
  registerDevice(@CurrentUser() u: { id: string }, @Body() body: RegisterDeviceDto) {
    return this.notifications.registerDevice(u.id, body.platform, body.token)
  }
}
