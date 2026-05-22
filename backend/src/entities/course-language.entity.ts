import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('course_languages')
export class CourseLanguageEntity {
  /** UUID (36) or legacy `lang-{uuid}` (41); column allows 64 for headroom. */
  @PrimaryColumn('varchar', { length: 64 })
  id: string

  /** Short code, e.g. en, es, fr */
  @Column({ unique: true, length: 16 })
  code: string

  @Column({ length: 120 })
  name: string
}
