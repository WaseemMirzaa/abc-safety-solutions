import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

export type UserRole = 'learner' | 'admin'

@Entity('users')
export class UserEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ unique: true, length: 255 })
  email: string

  @Column({ length: 255 })
  passwordHash: string

  @Column({ length: 255 })
  name: string

  @Column({ type: 'enum', enum: ['learner', 'admin'], default: 'learner' })
  role: UserRole

  @Column({ type: 'varchar', length: 64, nullable: true })
  stripeCustomerId: string | null

  @CreateDateColumn()
  createdAt: Date
}
