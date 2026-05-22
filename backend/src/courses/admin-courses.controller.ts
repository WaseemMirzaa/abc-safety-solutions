import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import { CoursesService } from './courses.service'
import { AdminCourseDto } from './dto/admin-course.dto'

@Controller('admin/courses')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminCoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list() {
    return this.courses.findAllAdmin()
  }

  @Post()
  create(@Body() dto: AdminCourseDto) {
    return this.courses.create({
      id: dto.id,
      slug: dto.slug,
      title: dto.title,
      summary: dto.summary,
      description: dto.description,
      categoryId: dto.categoryId,
      languageId: dto.languageId,
      priceCents: dto.priceCents,
      durationMinutes: dto.durationMinutes,
      slideCount: dto.slideCount,
      certificateValidityDays: dto.certificateValidityDays ?? null,
      imageUrl: dto.imageUrl,
      published: dto.published,
      slideImageUrls: dto.slideImageUrls?.length ? dto.slideImageUrls : null,
      slides: dto.slides?.length ? dto.slides : null,
    })
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: AdminCourseDto) {
    return this.courses.update(id, {
      slug: dto.slug,
      title: dto.title,
      summary: dto.summary,
      description: dto.description,
      categoryId: dto.categoryId,
      languageId: dto.languageId,
      priceCents: dto.priceCents,
      durationMinutes: dto.durationMinutes,
      slideCount: dto.slideCount,
      certificateValidityDays: dto.certificateValidityDays ?? null,
      imageUrl: dto.imageUrl,
      published: dto.published,
      slideImageUrls: dto.slideImageUrls?.length ? dto.slideImageUrls : null,
      slides: dto.slides?.length ? dto.slides : null,
    })
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.courses.remove(id)
    return { ok: true }
  }
}
