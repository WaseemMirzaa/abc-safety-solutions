import { Column, Entity, PrimaryColumn } from 'typeorm'
import type { CourseSlide } from '../common/course-slide.types'

@Entity('courses')
export class CourseEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ unique: true, length: 255 })
  slug: string

  @Column({ length: 500 })
  title: string

  @Column({ type: 'text' })
  summary: string

  @Column({ type: 'text' })
  description: string

  @Column({ type: 'varchar', length: 36 })
  categoryId: string

  /** Instruction language (course_languages.id). Defaults to English. */
  @Column({ type: 'varchar', length: 36, default: 'lang-en' })
  languageId: string

  @Column({ type: 'int' })
  priceCents: number

  @Column({ type: 'int' })
  durationMinutes: number

  @Column({ type: 'int' })
  slideCount: number

  /** Absolute expiration of certificate from issue date (days). Null = no expiry shown. */
  @Column({ type: 'int', nullable: true })
  certificateValidityDays: number | null

  @Column({ type: 'text' })
  imageUrl: string

  @Column({ type: 'json', nullable: true })
  slideImageUrls: string[] | null

  /** Ordered learner content: images, PDFs (with embedded media), or videos. */
  @Column({ type: 'json', nullable: true })
  slides: CourseSlide[] | null

  @Column({ default: false })
  published: boolean

  /** Shown in homepage "Popular online courses" when true (and published). */
  @Column({ default: false })
  popular: boolean
}
