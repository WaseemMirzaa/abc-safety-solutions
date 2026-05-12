import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { TestsService } from './tests.service'
import { AdminTestDto } from './dto/admin-test.dto'

@Controller('admin/tests')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminTestsController {
  constructor(private readonly tests: TestsService) {}

  @Get()
  list() {
    return this.tests.adminList()
  }

  @Post()
  upsert(@Body() body: AdminTestDto) {
    return this.tests.adminUpsert(body)
  }

  @Put(':id')
  put(@Param('id') id: string, @Body() body: AdminTestDto) {
    return this.tests.adminUpsert({ ...body, id })
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tests.adminDelete(id)
  }
}
