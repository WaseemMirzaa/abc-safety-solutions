import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('notifications')
export class NotificationEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ type: 'varchar', length: 36 })
  userId: string

  @Column({ length: 500 })
  title: string

  @Column({ type: 'text' })
  body: string

  @Column({ type: 'varchar', length: 100, default: 'announcement' })
  type: string

  @Column({ default: false })
  read: boolean

  @Column({ type: 'json', nullable: true })
  metaJson: Record<string, unknown> | null

  @CreateDateColumn()
  createdAt: Date
}
