import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { DataSource } from 'typeorm'

/** Idempotent schema fixes for production (synchronize is off). */
@Injectable()
export class SchemaMigrationsService implements OnModuleInit {
  private readonly log = new Logger(SchemaMigrationsService.name)

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.ensureCourseLanguages()
    await this.ensureEnrollmentOrderIdWidth()
  }

  private async ensureCourseLanguages() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS course_languages (
        id VARCHAR(36) NOT NULL,
        code VARCHAR(16) NOT NULL,
        name VARCHAR(120) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_course_languages_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    await this.dataSource.query(
      `INSERT IGNORE INTO course_languages (id, code, name) VALUES ('lang-en', 'en', 'English')`,
    )
    const col = await this.dataSource.query<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'languageId'`,
    )
    if (Number(col[0]?.n ?? 0) === 0) {
      this.log.warn('courses.languageId missing; adding column (default English)')
      await this.dataSource.query(
        `ALTER TABLE courses ADD COLUMN languageId VARCHAR(36) NOT NULL DEFAULT 'lang-en'`,
      )
      await this.dataSource.query(`UPDATE courses SET languageId = 'lang-en' WHERE languageId IS NULL OR languageId = ''`)
    }
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
