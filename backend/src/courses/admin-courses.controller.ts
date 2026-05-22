import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../common/admin.guard'
import type { CourseSlide } from '../common/course-slide.types'
import { CourseEntity } from '../entities/course.entity'
import { CourseContentService } from './course-content.service'
import { CoursesService } from './courses.service'
import { AdminCourseDto } from './dto/admin-course.dto'

@Controller('admin/courses')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminCoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly courseContent: CourseContentService,
  ) {}

  private async resolveContentFields(dto: AdminCourseDto) {
    let slides = dto.slides as CourseSlide[] | undefined
    let durationMinutes = dto.durationMinutes
    let slideCount = dto.slideCount
    if (slides?.length) {
      const prepared = await this.courseContent.prepareSlides(slides)
      slides = prepared.slides
      durationMinutes = prepared.metrics.durationMinutes
      slideCount = prepared.metrics.slideCount
    }
    return { slides, durationMinutes, slideCount }
  }

  @Get()
  list() {
    return this.courses.findAllAdmin()
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.courses.findByIdAdmin(id)
  }

  @Post()
  async create(@Body() dto: AdminCourseDto) {
    const content = await this.resolveContentFields(dto)
    return this.courses.create({
      id: dto.id,
      slug: dto.slug,
      title: dto.title,
      summary: dto.summary,
      description: dto.description,
      categoryId: dto.categoryId,
      languageId: dto.languageId,
      priceCents: dto.priceCents,
      discountPercent: dto.discountPercent ?? 0,
      durationMinutes: content.durationMinutes,
      slideCount: content.slideCount,
      certificateValidityDays: dto.certificateValidityDays ?? null,
      imageUrl: dto.imageUrl,
      published: dto.published,
      popular: dto.popular,
      slideImageUrls: dto.slideImageUrls?.length ? dto.slideImageUrls : null,
      slides: content.slides?.length ? content.slides : null,
    })
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: AdminCourseDto) {
    const content = await this.resolveContentFields(dto)
    const patch: Partial<CourseEntity> = {
      slug: dto.slug,
      title: dto.title,
      summary: dto.summary,
      description: dto.description,
      categoryId: dto.categoryId,
      languageId: dto.languageId,
      priceCents: dto.priceCents,
      discountPercent: dto.discountPercent ?? 0,
      durationMinutes: content.durationMinutes,
      slideCount: content.slideCount,
      certificateValidityDays: dto.certificateValidityDays ?? null,
      imageUrl: dto.imageUrl,
      published: dto.published,
      popular: dto.popular,
    }
    if (dto.slides !== undefined) {
      patch.slides = content.slides?.length ? content.slides : null
    }
    if (dto.slideImageUrls !== undefined) {
      patch.slideImageUrls = dto.slideImageUrls.length ? dto.slideImageUrls : null
    }
    return this.courses.update(id, patch)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.courses.remove(id)
    return { ok: true }
  }
}
