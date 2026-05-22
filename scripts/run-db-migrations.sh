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
      id VARCHAR(36) NOT NULL,
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
    *)
      echo "   $base"
      mysql_file "$f"
      ;;
  esac
done

echo "✓ Migrations applied."
echo "   Restart API: pm2 restart abc-api   (or: docker compose restart api)"
