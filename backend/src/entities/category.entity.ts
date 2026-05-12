import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('categories')
export class CategoryEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ length: 255 })
  name: string

  @Column({ length: 255, unique: true })
  slug: string

  @Column({ type: 'varchar', length: 36, nullable: true })
  parentId: string | null

  @Column({ type: 'text' })
  certificationText: string
}
