import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('certificates')
export class CertificateEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ type: 'varchar', length: 36 })
  userId: string

  @Column({ type: 'varchar', length: 36, nullable: true })
  courseId: string | null

  @Column({ type: 'varchar', length: 16, default: 'platform' })
  source: 'platform' | 'manual'

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ type: 'varchar', length: 36 })
  categoryId: string

  @Column({ length: 500 })
  courseName: string

  @Column({ length: 500 })
  userName: string

  @Column({ type: 'text', nullable: true })
  certificationText: string | null

  @CreateDateColumn()
  issuedAt: Date

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null

  /** Public numeric ID shown as #100001; unique across all certificates. */
  @Column({ type: 'int', unique: true })
  certificateNumber: number

  /** URL of an uploaded certificate file (image or PDF) for manual certs. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null
}
