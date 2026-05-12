import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('media_assets')
export class MediaAssetEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ length: 500 })
  label: string

  @Column({ type: 'text' })
  url: string

  @Column({ type: 'enum', enum: ['image', 'audio', 'document', 'other'], default: 'image' })
  kind: 'image' | 'audio' | 'document' | 'other'

  @Column({ type: 'enum', enum: ['url', 'upload'], default: 'upload' })
  source: 'url' | 'upload'

  @Column({ type: 'varchar', length: 500, nullable: true })
  fileName: string | null

  @CreateDateColumn()
  createdAt: Date
}
