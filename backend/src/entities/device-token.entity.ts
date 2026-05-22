import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('device_tokens')
export class DeviceTokenEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column({ type: 'varchar', length: 36 })
  userId: string

  @Column({ type: 'varchar', length: 16 })
  platform: 'web' | 'android' | 'ios'

  @Column({ type: 'varchar', length: 512 })
  token: string

  @CreateDateColumn()
  createdAt: Date
}
