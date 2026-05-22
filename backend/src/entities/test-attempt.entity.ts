import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('test_attempts')
export class TestAttemptEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ type: 'varchar', length: 36 })
  userId: string

  @Column({ type: 'varchar', length: 36 })
  courseId: string

  @Column({ type: 'varchar', length: 36 })
  enrollmentId: string

  @Column({ type: 'int' })
  attemptNumber: number

  @Column({ type: 'int' })
  scorePercent: number

  @Column({ type: 'int' })
  passPercent: number

  @Column({ default: false })
  passed: boolean

  @Column({ default: false })
  timedOut: boolean

  @CreateDateColumn()
  submittedAt: Date
}
