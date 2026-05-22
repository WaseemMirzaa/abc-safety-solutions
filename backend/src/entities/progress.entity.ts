import { Column, Entity, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm'

@Entity('progress')
@Unique(['userId', 'courseId'])
export class ProgressEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ type: 'varchar', length: 36 })
  userId: string

  @Column({ type: 'varchar', length: 36 })
  courseId: string

  @Column({ type: 'int', default: 0 })
  slideIndex: number

  /** Highest slide index the learner has reached (for completion %). */
  @Column({ type: 'int', default: 0 })
  maxSlideIndex: number

  @Column({ type: 'int', default: 0 })
  audioTimeSec: number

  @Column({ default: false })
  completedSlides: boolean

  @Column({ default: false })
  testPassed: boolean

  @UpdateDateColumn()
  updatedAt: Date
}
