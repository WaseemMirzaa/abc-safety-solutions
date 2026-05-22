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
    *)
      echo "   $base"
      mysql_file "$f"
      ;;
  esac
done

echo "✓ Migrations applied."
echo "   Restart API: pm2 restart abc-api   (or: docker compose restart api)"
