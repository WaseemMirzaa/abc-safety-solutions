import { Column, Entity, PrimaryColumn } from 'typeorm'

export type TestAnswerOption = { id: string; label: string; isCorrect: boolean }
export type TestQuestion = { id: string; prompt: string; options: TestAnswerOption[] }

@Entity('course_tests')
export class CourseTestEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ type: 'varchar', length: 36 })
  courseId: string

  @Column({ length: 500 })
  title: string

  @Column({ type: 'int' })
  passPercent: number

  @Column({ default: false })
  published: boolean

  @Column({ type: 'varchar', length: 32 })
  updatedAt: string

  @Column({ type: 'json' })
  questions: TestQuestion[]
}
