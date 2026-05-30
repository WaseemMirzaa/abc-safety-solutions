import { Controller, Get, Param } from '@nestjs/common'
import { CoursesService } from './courses.service'
import { CourseContentService } from './course-content.service'

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly courseContent: CourseContentService,
  ) {}

  @Get()
  listPublished() {
    return this.courses.findPublished()
  }

  @Get('slug/:slug')
  async bySlug(@Param('slug') slug: string) {
    const dto = await this.courses.findBySlug(slug)
    return { ...dto, slides: this.courseContent.fixVideoUrls(dto.slides) }
  }

  @Get(':id')
  async byId(@Param('id') id: string) {
    const dto = await this.courses.findPublishedById(id)
    return { ...dto, slides: this.courseContent.fixVideoUrls(dto.slides) }
  }
}
