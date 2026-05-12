import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { MediaService } from './media.service'
import { AdminMediaDto } from './dto/admin-media.dto'

@Controller('admin/media')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminMediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list() {
    return this.media.list()
  }

  @Post()
  create(@Body() body: AdminMediaDto) {
    return this.media.save(body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.media.delete(id)
  }
}
