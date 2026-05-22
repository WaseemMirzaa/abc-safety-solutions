import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { CourseEntity } from '../entities/course.entity'
import { CategoryEntity } from '../entities/category.entity'
import type { CourseSlide } from '../common/course-slide.types'

export type CourseDto = {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  categoryId: string
  priceCents: number
  durationMinutes: number
  slideCount: number
  slideImageUrls?: string[]
  slides?: CourseSlide[]
  imageUrl: string
  published: boolean
  certificateValidityDays?: number | null
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
  ) {}

  private normalizeSlides(c: CourseEntity): CourseSlide[] | undefined {
    if (c.slides?.length) return c.slides
    const legacy = c.slideImageUrls?.filter(Boolean) ?? []
    if (!legacy.length) return undefined
    return legacy.map((url, i) => ({
      id: `legacy-${i}`,
      type: 'image' as const,
      url,
    }))
  }

  private deckSlideCount(slides: CourseSlide[] | undefined, fallback: number): number {
    const deck = slides?.find((s) => s.type === 'pptx' || s.type === 'ppt')
    if (deck?.deckSlideCount && deck.deckSlideCount > 0) return deck.deckSlideCount
    if (deck && fallback >= 1) return fallback
    return 0
  }

  private map(c: CourseEntity): CourseDto {
    const slides = this.normalizeSlides(c)
    const deckCount = this.deckSlideCount(slides, c.slideCount)
    const slideCount = deckCount > 0
      ? deckCount
      : slides?.length ?? (c.slideImageUrls?.length ? c.slideImageUrls.length : c.slideCount)
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      description: c.description,
      categoryId: c.categoryId,
      priceCents: c.priceCents,
      durationMinutes: c.durationMinutes,
      slideCount: Math.max(1, slideCount),
      slideImageUrls: c.slideImageUrls ?? undefined,
      slides,
      imageUrl: c.imageUrl,
      published: c.published,
      certificateValidityDays: c.certificateValidityDays,
    }
  }

  async findPublished(): Promise<CourseDto[]> {
    const list = await this.courses.find({ where: { published: true }, order: { title: 'ASC' } })
    return list.map((c) => this.map(c))
  }

  /** Admin UI lists — published catalog only (drafts are hidden until published). */
  async findAllAdmin(): Promise<CourseDto[]> {
    const list = await this.courses.find({ where: { published: true }, order: { title: 'ASC' } })
    return list.map((c) => this.map(c))
  }

  async findBySlug(slug: string): Promise<CourseDto> {
    const c = await this.courses.findOne({ where: { slug } })
    if (!c || !c.published) throw new NotFoundException('Course not found')
    return this.map(c)
  }

  async findPublishedById(id: string): Promise<CourseDto> {
    const c = await this.courses.findOne({ where: { id, published: true } })
    if (!c) throw new NotFoundException('Course not found')
    return this.map(c)
  }

  /** Public DTO from entity (e.g. enrollment payloads). */
  toDto(c: CourseEntity): CourseDto {
    return this.map(c)
  }

  async findEntity(id: string): Promise<CourseEntity | null> {
    return this.courses.findOne({ where: { id } })
  }

  async findEntitiesByIds(ids: string[]): Promise<CourseEntity[]> {
    if (!ids.length) return []
    return this.courses.find({ where: { id: In(ids) } })
  }

  async create(data: Partial<CourseEntity> & Pick<CourseEntity, 'id' | 'slug' | 'title' | 'categoryId'>) {
    const row = this.courses.create({
      ...data,
      certificateValidityDays: data.certificateValidityDays ?? null,
      slideImageUrls: data.slideImageUrls ?? null,
      slides: data.slides ?? null,
      published: data.published ?? false,
    })
    return this.courses.save(row)
  }

  async update(id: string, patch: Partial<CourseEntity>) {
    await this.courses.update({ id }, patch)
    const c = await this.courses.findOne({ where: { id } })
    if (!c) throw new NotFoundException()
    return this.map(c)
  }

  async remove(id: string) {
    await this.courses.delete({ id })
  }
}
