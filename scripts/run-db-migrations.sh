#!/usr/bin/env bash
# Apply SQL migrations from backend/scripts/migrations/ (safe to re-run).
# Run from project root: bash scripts/run-db-migrations.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $ROOT"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-abc}"
DB_NAME="${DB_NAME:-abc_portal}"

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "ERROR: DB_PASSWORD is not set in .env"
  exit 1
fi

MYSQL_ARGS=(-h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -s)
USE_DOCKER=false
if docker compose ps mysql 2>/dev/null | grep -q 'Up'; then
  USE_DOCKER=true
elif ! command -v mysql >/dev/null 2>&1; then
  echo "ERROR: mysql client not found and Docker mysql service is not running."
  exit 1
fi

mysql_scalar() {
  if [ "$USE_DOCKER" = true ]; then
    docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -s -e "$1"
  else
    mysql "${MYSQL_ARGS[@]}" -e "$1"
  fi
}

mysql_file() {
  if [ "$USE_DOCKER" = true ]; then
    docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <"$1"
  else
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <"$1"
  fi
}

migrate_users_stripe_customer() {
  local exists
  exists="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='users' AND COLUMN_NAME='stripeCustomerId';")"
  if [ "${exists:-0}" = "0" ]; then
    echo "   002_add_users_stripe_customer.sql — adding column stripeCustomerId"
    mysql_scalar "ALTER TABLE users ADD COLUMN stripeCustomerId VARCHAR(64) NULL;" >/dev/null
  else
    echo "   002_add_users_stripe_customer.sql — stripeCustomerId already exists (skip)"
  fi
}

migrate_course_languages() {
  local table_exists
  table_exists="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='course_languages';")"
  if [ "${table_exists:-0}" = "0" ]; then
    echo "   004_add_course_languages.sql — creating course_languages table"
    mysql_scalar "CREATE TABLE course_languages (
      id VARCHAR(64) NOT NULL,
      code VARCHAR(16) NOT NULL,
      name VARCHAR(120) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY UQ_course_languages_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;" >/dev/null
  else
    echo "   004_add_course_languages.sql — course_languages table exists (skip create)"
  fi
  mysql_scalar "INSERT IGNORE INTO course_languages (id, code, name) VALUES ('lang-en', 'en', 'English');" >/dev/null
  local col
  col="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='courses' AND COLUMN_NAME='languageId';")"
  if [ "${col:-0}" = "0" ]; then
    echo "   004_add_course_languages.sql — adding courses.languageId"
    mysql_scalar "ALTER TABLE courses ADD COLUMN languageId VARCHAR(36) NOT NULL DEFAULT 'lang-en';" >/dev/null
    mysql_scalar "UPDATE courses SET languageId = 'lang-en' WHERE languageId IS NULL OR languageId = '';" >/dev/null
  else
    echo "   004_add_course_languages.sql — courses.languageId already exists (skip)"
  fi
  local id_len
  id_len="$(mysql_scalar "SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='course_languages' AND COLUMN_NAME='id';")"
  if [ "${id_len:-0}" -lt 64 ]; then
    echo "   004 — widening course_languages.id to VARCHAR(64) (fixes lang-{uuid} inserts)"
    mysql_scalar "ALTER TABLE course_languages MODIFY COLUMN id VARCHAR(64) NOT NULL;" >/dev/null
  else
    echo "   004 — course_languages.id already wide enough (skip)"
  fi
}

migrate_widen_order_id() {
  local len
  len="$(mysql_scalar "SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='enrollments' AND COLUMN_NAME='orderId';")"
  if [ "${len:-0}" -lt 255 ]; then
    echo "   003_widen_enrollments_order_id.sql — widening orderId to VARCHAR(255)"
    mysql_scalar "ALTER TABLE enrollments MODIFY COLUMN orderId VARCHAR(255) NOT NULL;" >/dev/null
  else
    echo "   003_widen_enrollments_order_id.sql — orderId already wide enough (skip)"
  fi
}

migrate_courses_popular() {
  local exists
  exists="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='courses' AND COLUMN_NAME='popular';")"
  if [ "${exists:-0}" = "0" ]; then
    echo "   005_add_courses_popular.sql — adding column popular"
    mysql_scalar "ALTER TABLE courses ADD COLUMN popular TINYINT(1) NOT NULL DEFAULT 0;" >/dev/null
  else
    echo "   005_add_courses_popular.sql — popular column already exists (skip)"
  fi
}

migrate_progress_max_slide() {
  local exists
  exists="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='progress' AND COLUMN_NAME='maxSlideIndex';")"
  if [ "${exists:-0}" = "0" ]; then
    echo "   007_add_progress_max_slide.sql — adding column maxSlideIndex"
    mysql_scalar "ALTER TABLE progress ADD COLUMN maxSlideIndex INT NOT NULL DEFAULT 0;" >/dev/null
    mysql_scalar "UPDATE progress SET maxSlideIndex = GREATEST(maxSlideIndex, slideIndex);" >/dev/null
  else
    echo "   007_add_progress_max_slide.sql — maxSlideIndex already exists (skip)"
  fi
}

migrate_test_time_limit() {
  local exists
  exists="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='course_tests' AND COLUMN_NAME='timeLimitMinutes';")"
  if [ "${exists:-0}" = "0" ]; then
    echo "   006_add_test_time_limit.sql — adding column timeLimitMinutes"
    mysql_scalar "ALTER TABLE course_tests ADD COLUMN timeLimitMinutes INT NOT NULL DEFAULT 0;" >/dev/null
  else
    echo "   006_add_test_time_limit.sql — timeLimitMinutes already exists (skip)"
  fi
}

migrate_certificate_number() {
  local exists
  exists="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='certificates' AND COLUMN_NAME='certificateNumber';")"
  if [ "${exists:-0}" = "0" ]; then
    echo "   008_add_certificate_number.sql — adding column certificateNumber"
    mysql_scalar "ALTER TABLE certificates ADD COLUMN certificateNumber INT NULL;" >/dev/null
  else
    echo "   008_add_certificate_number.sql — certificateNumber column exists"
  fi
  local nulls
  nulls="$(mysql_scalar "SELECT COUNT(*) FROM certificates WHERE certificateNumber IS NULL;")"
  if [ "${nulls:-0}" != "0" ]; then
    echo "   008_add_certificate_number.sql — backfilling ${nulls} row(s) from #100001"
    mysql_scalar "SET @n := 100000; UPDATE certificates SET certificateNumber = (@n := @n + 1) WHERE certificateNumber IS NULL ORDER BY issuedAt ASC;" >/dev/null
  fi
  local uk
  uk="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='certificates' AND COLUMN_NAME='certificateNumber' AND NON_UNIQUE=0;")"
  if [ "${uk:-0}" = "0" ]; then
    mysql_scalar "ALTER TABLE certificates MODIFY COLUMN certificateNumber INT NOT NULL;" >/dev/null
    mysql_scalar "ALTER TABLE certificates ADD UNIQUE KEY UQ_certificates_certificateNumber (certificateNumber);" >/dev/null
  fi
}

migrate_discounts_and_promo_codes() {
  local col
  col="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='courses' AND COLUMN_NAME='discountPercent';")"
  if [ "${col:-0}" = "0" ]; then
    echo "   009 — adding courses.discountPercent"
    mysql_scalar "ALTER TABLE courses ADD COLUMN discountPercent INT NOT NULL DEFAULT 0;" >/dev/null
  else
    echo "   009 — courses.discountPercent already exists (skip)"
  fi
  local tbl
  tbl="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='promo_codes';")"
  if [ "${tbl:-0}" = "0" ]; then
    echo "   009 — creating promo_codes table"
    mysql_scalar "CREATE TABLE promo_codes (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;" >/dev/null
  else
    echo "   009 — promo_codes table exists (skip)"
  fi
  for spec in \
    "listPriceCents:INT NULL" \
    "amountPaidCents:INT NULL" \
    "courseDiscountPercent:INT NOT NULL DEFAULT 0" \
    "promoCode:VARCHAR(64) NULL" \
    "promoDiscountPercent:INT NOT NULL DEFAULT 0"; do
    local name="${spec%%:*}"
    local ddl="${spec#*:}"
    col="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='enrollments' AND COLUMN_NAME='${name}';")"
    if [ "${col:-0}" = "0" ]; then
      echo "   009 — adding enrollments.${name}"
      mysql_scalar "ALTER TABLE enrollments ADD COLUMN ${name} ${ddl};" >/dev/null
    else
      echo "   009 — enrollments.${name} already exists (skip)"
    fi
  done
}

migrate_test_attempts() {
  local col
  col="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='enrollments' AND COLUMN_NAME='testAttemptsRemaining';")"
  if [ "${col:-0}" = "0" ]; then
    echo "   010 — adding enrollments.testAttemptsRemaining, attemptsExhausted"
    mysql_scalar "ALTER TABLE enrollments ADD COLUMN testAttemptsRemaining INT NOT NULL DEFAULT 3;" >/dev/null
    mysql_scalar "ALTER TABLE enrollments ADD COLUMN attemptsExhausted TINYINT(1) NOT NULL DEFAULT 0;" >/dev/null
  else
    echo "   010 — enrollment attempt columns already exist (skip)"
  fi
  local tbl
  tbl="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='test_attempts';")"
  if [ "${tbl:-0}" = "0" ]; then
    echo "   010 — creating test_attempts table"
    mysql_scalar "CREATE TABLE test_attempts (
      id VARCHAR(36) NOT NULL,
      userId VARCHAR(36) NOT NULL,
      courseId VARCHAR(36) NOT NULL,
      enrollmentId VARCHAR(36) NOT NULL,
      attemptNumber INT NOT NULL,
      scorePercent INT NOT NULL,
      passPercent INT NOT NULL,
      passed TINYINT(1) NOT NULL DEFAULT 0,
      timedOut TINYINT(1) NOT NULL DEFAULT 0,
      submittedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      KEY IDX_test_attempts_user_course (userId, courseId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;" >/dev/null
  else
    echo "   010 — test_attempts table exists (skip)"
  fi
}

migrate_notifications_and_manual_certs() {
  local tbl
  tbl="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='notifications';")"
  if [ "${tbl:-0}" = "0" ]; then
    echo "   011 — creating notifications table"
    mysql_scalar "CREATE TABLE notifications (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;" >/dev/null
  else
    echo "   011 — notifications table exists (skip)"
  fi
  tbl="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='device_tokens';")"
  if [ "${tbl:-0}" = "0" ]; then
    echo "   011 — creating device_tokens table"
    mysql_scalar "CREATE TABLE device_tokens (
      id VARCHAR(36) NOT NULL,
      userId VARCHAR(36) NOT NULL,
      platform VARCHAR(16) NOT NULL,
      token VARCHAR(512) NOT NULL,
      createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      KEY IDX_device_tokens_user (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;" >/dev/null
  fi
  local src
  src="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='certificates' AND COLUMN_NAME='source';")"
  if [ "${src:-0}" = "0" ]; then
    echo "   011 — adding certificates.source, notes; nullable courseId"
    mysql_scalar "ALTER TABLE certificates ADD COLUMN source VARCHAR(16) NOT NULL DEFAULT 'platform';" >/dev/null
    mysql_scalar "ALTER TABLE certificates ADD COLUMN notes TEXT NULL;" >/dev/null
    mysql_scalar "ALTER TABLE certificates MODIFY COLUMN courseId VARCHAR(36) NULL;" >/dev/null
  else
    echo "   011 — certificate manual columns already exist (skip)"
  fi
}

migrate_courses_slides() {
  local exists
  exists="$(mysql_scalar "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='courses' AND COLUMN_NAME='slides';")"
  if [ "${exists:-0}" = "0" ]; then
    echo "   001_add_courses_slides.sql — adding column slides"
    mysql_scalar "ALTER TABLE courses ADD COLUMN slides JSON NULL;" >/dev/null
  else
    echo "   001_add_courses_slides.sql — slides column already exists (skip)"
  fi
}

MIG_DIR="$ROOT/backend/scripts/migrations"
if [ ! -d "$MIG_DIR" ]; then
  echo "No migrations directory: $MIG_DIR"
  exit 0
fi

shopt -s nullglob
files=("$MIG_DIR"/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "No .sql migrations to apply."
  exit 0
fi

echo "==> Applying migrations to $DB_NAME @ $DB_HOST:$DB_PORT ..."

for f in "${files[@]}"; do
  base="$(basename "$f")"
  case "$base" in
    001_add_courses_slides.sql) migrate_courses_slides ;;
    002_add_users_stripe_customer.sql) migrate_users_stripe_customer ;;
    003_widen_enrollments_order_id.sql) migrate_widen_order_id ;;
    004_add_course_languages.sql) migrate_course_languages ;;
    005_add_courses_popular.sql) migrate_courses_popular ;;
    006_add_test_time_limit.sql) migrate_test_time_limit ;;
    007_add_progress_max_slide.sql) migrate_progress_max_slide ;;
    008_add_certificate_number.sql) migrate_certificate_number ;;
    009_discounts_and_promo_codes.sql) migrate_discounts_and_promo_codes ;;
    010_test_attempts_and_enrollment_limits.sql) migrate_test_attempts ;;
    011_notifications_and_manual_certs.sql) migrate_notifications_and_manual_certs ;;
    *)
      echo "   $base"
      mysql_file "$f"
      ;;
  esac
done

echo "✓ Migrations applied."
echo "   Restart API: pm2 restart abc-api   (or: docker compose restart api)"
