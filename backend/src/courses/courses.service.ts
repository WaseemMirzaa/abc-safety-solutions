import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { CourseEntity } from '../entities/course.entity'
import { CategoryEntity } from '../entities/category.entity'

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

  private map(c: CourseEntity): CourseDto {
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      description: c.description,
      categoryId: c.categoryId,
      priceCents: c.priceCents,
      durationMinutes: c.durationMinutes,
      slideCount: c.slideCount,
      slideImageUrls: c.slideImageUrls ?? undefined,
      imageUrl: c.imageUrl,
      published: c.published,
      certificateValidityDays: c.certificateValidityDays,
    }
  }

  async findPublished(): Promise<CourseDto[]> {
    const list = await this.courses.find({ where: { published: true }, order: { title: 'ASC' } })
    return list.map((c) => this.map(c))
  }

  async findAllAdmin(): Promise<CourseDto[]> {
    const list = await this.courses.find({ order: { title: 'ASC' } })
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
