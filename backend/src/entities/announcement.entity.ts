import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('announcements')
export class AnnouncementEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ length: 500 })
  title: string

  @Column({ type: 'text' })
  body: string

  @Column({ type: 'enum', enum: ['draft', 'sent'], default: 'draft' })
  status: 'draft' | 'sent'

  @CreateDateColumn()
  createdAt: Date

  @Column({ type: 'datetime', nullable: true })
  sentAt: Date | null
}
