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
    await this.ensureCoursePopular()
    await this.ensureCourseDiscountPercent()
    await this.ensurePromoCodesTable()
    await this.ensureEnrollmentPricingColumns()
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

  private async ensureCoursePopular() {
    const col = await this.dataSource.query<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'popular'`,
    )
    if (Number(col[0]?.n ?? 0) === 0) {
      this.log.warn('courses.popular missing; adding column')
      await this.dataSource.query(
        `ALTER TABLE courses ADD COLUMN popular TINYINT(1) NOT NULL DEFAULT 0`,
      )
    }
  }

  private async ensureCourseDiscountPercent() {
    const col = await this.dataSource.query<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'discountPercent'`,
    )
    if (Number(col[0]?.n ?? 0) === 0) {
      this.log.warn('courses.discountPercent missing; adding column')
      await this.dataSource.query(
        `ALTER TABLE courses ADD COLUMN discountPercent INT NOT NULL DEFAULT 0`,
      )
    }
  }

  private async ensurePromoCodesTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id VARCHAR(36) NOT NULL,
        code VARCHAR(64) NOT NULL,
        description VARCHAR(500) NOT NULL DEFAULT '',
        discountPercent INT NOT NULL DEFAULT 10,
        active TINYINT(1) NOT NULL DEFAULT 1,
        expiresAt DATETIME NULL,
        maxUses INT NULL,
        useCount INT NOT NULL DEFAULT 0,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_promo_codes_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
  }

  private async ensureEnrollmentPricingColumns() {
    for (const spec of [
      { name: 'listPriceCents', ddl: 'INT NULL' },
      { name: 'amountPaidCents', ddl: 'INT NULL' },
      { name: 'courseDiscountPercent', ddl: 'INT NOT NULL DEFAULT 0' },
      { name: 'promoCode', ddl: 'VARCHAR(64) NULL' },
      { name: 'promoDiscountPercent', ddl: 'INT NOT NULL DEFAULT 0' },
    ]) {
      const col = await this.dataSource.query<{ n: number }[]>(
        `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'enrollments' AND COLUMN_NAME = ?`,
        [spec.name],
      )
      if (Number(col[0]?.n ?? 0) === 0) {
        this.log.warn(`enrollments.${spec.name} missing; adding column`)
        await this.dataSource.query(
          `ALTER TABLE enrollments ADD COLUMN ${spec.name} ${spec.ddl}`,
        )
      }
    }
  }
}
