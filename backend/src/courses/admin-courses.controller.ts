import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsInt, IsString, Min, MinLength } from 'class-validator'
import { AdminGuard } from '../common/admin.guard'
import type { CourseSlide } from '../common/course-slide.types'
import { CourseEntity } from '../entities/course.entity'
import { CourseContentService } from './course-content.service'
import { CoursesService } from './courses.service'
import { AdminCourseDto } from './dto/admin-course.dto'
import { CourseNarrationService } from '../narration/course-narration.service'

class NarrationEditDto {
  @IsString()
  @MinLength(1)
  slideId: string

  @IsInt()
  @Min(0)
  pageIndex: number

  @IsString()
  @MinLength(1)
  lang: string

  @IsString()
  text: string
}

@Controller('admin/courses')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminCoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly courseContent: CourseContentService,
    private readonly narration: CourseNarrationService,
  ) {}

  private async resolveContentFields(dto: AdminCourseDto) {
    let slides = dto.slides as CourseSlide[] | undefined
    let durationMinutes = dto.durationMinutes
    let slideCount = dto.slideCount
    if (slides?.length) {
      try {
        const prepared = await this.courseContent.prepareSlides(slides)
        slides = prepared.slides
        durationMinutes = prepared.metrics.durationMinutes
        slideCount = prepared.metrics.slideCount
      } catch (err) {
        throw new BadRequestException(
          `Video conversion failed: ${err instanceof Error ? err.message : String(err)}. ` +
          'Ensure ffmpeg is installed on the server (run: apt install ffmpeg) or re-upload the video.',
        )
      }
    }
    return { slides, durationMinutes, slideCount }
  }

  @Get()
  list() {
    return this.courses.findAllAdmin()
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const dto = await this.courses.findByIdAdmin(id)
    this.courseContent.scheduleVideoTranscode(id, dto.slides ?? [])
    return dto
  }

  @Post()
  async create(@Body() dto: AdminCourseDto) {
    const content = await this.resolveContentFields(dto)
    const created = await this.courses.create({
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
    this.courseContent.schedulePdfRender(created.id, content.slides ?? [])
    // Also fires directly (not only via the PDF-render hook): a new course whose content
    // is plain `image` slides (no PDF render step at all) still needs captioning.
    this.narration.scheduleForCourse(created.id)
    return created
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
      patch.slides = content.slides?.length ? content.slides : []
    }
    if (dto.slideImageUrls !== undefined) {
      patch.slideImageUrls = dto.slideImageUrls.length ? dto.slideImageUrls : null
    }
    // Narration is server-authoritative: whatever the client sent for `narration` on each
    // slide is discarded and replaced with what's currently persisted, keyed by slide id —
    // the client can only change narration via the dedicated endpoints below. Routed
    // through CourseNarrationService (not a plain courses.update()) so this read-merge-
    // write happens under the SAME per-course lock narration generation itself uses —
    // otherwise a routine metadata-only save (title/price) could race a concurrent
    // background-generation write and silently revert it. See applyAdminUpdate().
    const updated = await this.narration.applyAdminUpdate(id, patch)
    if (dto.slides !== undefined) {
      this.courseContent.schedulePdfRender(id, updated.slides ?? [])
      this.narration.scheduleForCourse(id)
    }
    return updated
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.courses.remove(id)
    return { ok: true }
  }

  // ── AI narration ────────────────────────────────────────────

  /** Lightweight polling target for the admin narration panel — never the full course
   *  payload, so polling can't race with (or clobber) an in-progress editor draft. */
  @Get(':id/narration-status')
  getNarrationStatus(@Param('id') id: string) {
    return this.narration.getStatusSummary(id)
  }

  /** Admin hand-edits a page's caption. Persists immediately and regenerates only that
   *  page+language's audio — independent of the whole-course Save button. */
  @Post(':id/narration')
  async editNarration(@Param('id') id: string, @Body() body: NarrationEditDto) {
    await this.narration.setManualText(id, body.slideId, body.pageIndex, body.lang, body.text)
    return this.narration.getStatusSummary(id)
  }

  /** Manual retry for pages stuck in 'failed' (automatic scheduling never retries a
   *  terminal failure on its own — see CourseNarrationService.retryFailedForCourse). */
  @Post(':id/narration/regenerate')
  async regenerateNarration(@Param('id') id: string) {
    await this.narration.retryFailedForCourse(id)
    return this.narration.getStatusSummary(id)
  }
}
