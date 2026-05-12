import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique } from 'typeorm'

@Entity('enrollments')
@Unique(['userId', 'courseId'])
export class EnrollmentEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ type: 'varchar', length: 36 })
  userId: string

  @Column({ type: 'varchar', length: 36 })
  courseId: string

  @Column({ length: 64 })
  orderId: string

  @Column({ default: false })
  refunded: boolean

  @CreateDateColumn()
  purchasedAt: Date
}
