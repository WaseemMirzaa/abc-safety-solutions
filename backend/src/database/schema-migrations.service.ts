import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { DataSource } from 'typeorm'

/** Idempotent schema fixes for production (synchronize is off). */
@Injectable()
export class SchemaMigrationsService implements OnModuleInit {
  private readonly log = new Logger(SchemaMigrationsService.name)

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.ensureEnrollmentOrderIdWidth()
  }

  private async ensureEnrollmentOrderIdWidth() {
    const rows = await this.dataSource.query<{ len: number | string }[]>(
      `SELECT CHARACTER_MAXIMUM_LENGTH AS len
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'enrollments'
         AND COLUMN_NAME = 'orderId'`,
    )
    const len = Number(rows[0]?.len ?? 0)
    if (!len || len >= 255) return
    this.log.warn(`enrollments.orderId is VARCHAR(${len}); widening to VARCHAR(255) for Stripe session ids`)
    await this.dataSource.query(
      `ALTER TABLE enrollments MODIFY COLUMN orderId VARCHAR(255) NOT NULL`,
    )
    this.log.log('enrollments.orderId widened to VARCHAR(255)')
  }
}
