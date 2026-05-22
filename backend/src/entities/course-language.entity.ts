import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('course_languages')
export class CourseLanguageEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  /** Short code, e.g. en, es, fr */
  @Column({ unique: true, length: 16 })
  code: string

  @Column({ length: 120 })
  name: string
}
