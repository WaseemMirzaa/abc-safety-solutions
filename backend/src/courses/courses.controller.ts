import { Controller, Get, Param } from '@nestjs/common'
import { CoursesService } from './courses.service'

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  listPublished() {
    return this.courses.findPublished()
  }

  @Get('slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.courses.findBySlug(slug)
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.courses.findPublishedById(id)
  }
}
