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

  /** Stripe Checkout session id (cs_…) or legacy order reference. */
  @Column({ type: 'varchar', length: 255 })
  orderId: string

  @Column({ default: false })
  refunded: boolean

  /** Knowledge-check attempts left for this purchase (default 3). */
  @Column({ type: 'int', default: 3 })
  testAttemptsRemaining: number

  /** True after 3 failed tests — learner must repurchase. */
  @Column({ default: false })
  attemptsExhausted: boolean

  /** List price at purchase (courses.priceCents). */
  @Column({ type: 'int', nullable: true })
  listPriceCents: number | null

  /** Amount charged (after course + promo discounts). */
  @Column({ type: 'int', nullable: true })
  amountPaidCents: number | null

  @Column({ type: 'int', default: 0 })
  courseDiscountPercent: number

  @Column({ type: 'varchar', length: 64, nullable: true })
  promoCode: string | null

  @Column({ type: 'int', default: 0 })
  promoDiscountPercent: number

  @CreateDateColumn()
  purchasedAt: Date
}
