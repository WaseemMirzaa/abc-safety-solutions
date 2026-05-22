import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { AdminUserInsightsService } from './admin-user-insights.service'

@Controller('admin/users')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminUsersInsightsController {
  constructor(private readonly insights: AdminUserInsightsService) {}

  @Get()
  list(@Query('q') q?: string, @Query('certificateCourse') certificateCourse?: string) {
    return this.insights.listDirectory(q, certificateCourse)
  }

  @Get(':userId')
  detail(@Param('userId') userId: string) {
    return this.insights.userDetail(userId)
  }
}
