import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('promo_codes')
export class PromoCodeEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ unique: true, length: 64 })
  code: string

  @Column({ type: 'varchar', length: 500, default: '' })
  description: string

  @Column({ type: 'int', default: 10 })
  discountPercent: number

  @Column({ default: true })
  active: boolean

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null

  @Column({ type: 'int', nullable: true })
  maxUses: number | null

  @Column({ type: 'int', default: 0 })
  useCount: number

  @CreateDateColumn()
  createdAt: Date
}
