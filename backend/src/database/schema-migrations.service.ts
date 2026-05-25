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
    await this.ensureTestAttempts()
    await this.ensureNotificationsAndManualCerts()
    await this.ensureAdminUserInsights()
  }

  private async ensureCourseLanguages() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS course_languages (
        id VARCHAR(64) NOT NULL,
        code VARCHAR(16) NOT NULL,
        name VARCHAR(120) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_course_languages_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    await this.dataSource.query(
      `INSERT IGNORE INTO course_languages (id, code, name) VALUES ('lang-en', 'en', 'English')`,
    )
    const idLen = await this.dataSource.query<{ len: number | string }[]>(
      `SELECT CHARACTER_MAXIMUM_LENGTH AS len
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_languages' AND COLUMN_NAME = 'id'`,
    )
    if (Number(idLen[0]?.len ?? 0) < 64) {
      this.log.warn('course_languages.id is narrow; widening to VARCHAR(64)')
      await this.dataSource.query(`ALTER TABLE course_languages MODIFY COLUMN id VARCHAR(64) NOT NULL`)
    }
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

  private async ensureTestAttempts() {
    for (const spec of [
      { name: 'testAttemptsRemaining', ddl: 'INT NOT NULL DEFAULT 3' },
      { name: 'attemptsExhausted', ddl: 'TINYINT(1) NOT NULL DEFAULT 0' },
    ]) {
      const col = await this.dataSource.query<{ n: number }[]>(
        `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'enrollments' AND COLUMN_NAME = ?`,
        [spec.name],
      )
      if (Number(col[0]?.n ?? 0) === 0) {
        this.log.warn(`enrollments.${spec.name} missing; adding column`)
        await this.dataSource.query(`ALTER TABLE enrollments ADD COLUMN ${spec.name} ${spec.ddl}`)
      }
    }
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        courseId VARCHAR(36) NOT NULL,
        enrollmentId VARCHAR(36) NOT NULL,
        attemptNumber INT NOT NULL,
        scorePercent INT NOT NULL,
        passPercent INT NOT NULL,
        passed TINYINT(1) NOT NULL,
        timedOut TINYINT(1) NOT NULL DEFAULT 0,
        submittedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_test_attempts_user_course (userId, courseId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
  }

  private async ensureNotificationsAndManualCerts() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        title VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        type VARCHAR(32) NOT NULL DEFAULT 'announcement',
        \`read\` TINYINT(1) NOT NULL DEFAULT 0,
        metaJson JSON NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_notifications_user (userId, createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        platform VARCHAR(16) NOT NULL,
        token VARCHAR(512) NOT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_device_tokens_user (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    for (const spec of [
      { name: 'source', ddl: "VARCHAR(16) NOT NULL DEFAULT 'platform'" },
      { name: 'notes', ddl: 'TEXT NULL' },
    ]) {
      const col = await this.dataSource.query<{ n: number }[]>(
        `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = ?`,
        [spec.name],
      )
      if (Number(col[0]?.n ?? 0) === 0) {
        this.log.warn(`certificates.${spec.name} missing; adding column`)
        await this.dataSource.query(`ALTER TABLE certificates ADD COLUMN ${spec.name} ${spec.ddl}`)
      }
    }
    const courseIdCol = await this.dataSource.query<{ nullable: string }[]>(
      `SELECT IS_NULLABLE AS nullable FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'courseId'`,
    )
    if (courseIdCol[0]?.nullable === 'NO') {
      this.log.warn('certificates.courseId is NOT NULL; allowing NULL for manual certificates')
      await this.dataSource.query(`ALTER TABLE certificates MODIFY COLUMN courseId VARCHAR(36) NULL`)
    }
  }

  /**
   * 012 — Admin user-insights improvements.
   *
   * Ensures:
   *   1. test_attempts.enrollmentId column exists (may be absent on deployments
   *      where the table was created before migration 010 was written).
   *   2. Index on test_attempts(enrollmentId) for the course-grouped admin panel.
   *   3. Index on certificates(userId, courseId) for fast per-user cert lookup.
   *   4. certificates.courseId is nullable (defensive — 011 already handles this,
   *      but a second guard is harmless).
   */
  private async ensureAdminUserInsights() {
    // 1. test_attempts.enrollmentId
    const enrollCol = await this.dataSource.query<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'test_attempts' AND COLUMN_NAME = 'enrollmentId'`,
    )
    if (Number(enrollCol[0]?.n ?? 0) === 0) {
      this.log.warn('test_attempts.enrollmentId missing; adding column')
      await this.dataSource.query(
        `ALTER TABLE test_attempts ADD COLUMN enrollmentId VARCHAR(36) NOT NULL DEFAULT ''`,
      )
    }

    // 2. Index on test_attempts(enrollmentId)
    const enrollIdx = await this.dataSource.query<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'test_attempts'
         AND INDEX_NAME = 'IDX_test_attempts_enrollment'`,
    )
    if (Number(enrollIdx[0]?.n ?? 0) === 0) {
      this.log.log('Adding IDX_test_attempts_enrollment index')
      await this.dataSource.query(
        `ALTER TABLE test_attempts ADD KEY IDX_test_attempts_enrollment (enrollmentId)`,
      )
    }

    // 3. Index on certificates(userId, courseId)
    const certIdx = await this.dataSource.query<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates'
         AND INDEX_NAME = 'IDX_certificates_user_course'`,
    )
    if (Number(certIdx[0]?.n ?? 0) === 0) {
      this.log.log('Adding IDX_certificates_user_course index')
      await this.dataSource.query(
        `ALTER TABLE certificates ADD KEY IDX_certificates_user_course (userId, courseId)`,
      )
    }

    // 4. Defensive: ensure certificates.courseId is nullable
    const certCourseId = await this.dataSource.query<{ nullable: string }[]>(
      `SELECT IS_NULLABLE AS nullable FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates' AND COLUMN_NAME = 'courseId'`,
    )
    if (certCourseId[0]?.nullable === 'NO') {
      this.log.warn('certificates.courseId still NOT NULL; correcting')
      await this.dataSource.query(
        `ALTER TABLE certificates MODIFY COLUMN courseId VARCHAR(36) NULL`,
      )
    }
  }
}
