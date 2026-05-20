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

if docker compose ps mysql 2>/dev/null | grep -q 'Up'; then
  for f in "${files[@]}"; do
    echo "   $(basename "$f")"
    docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <"$f"
  done
else
  if ! command -v mysql >/dev/null 2>&1; then
    echo "ERROR: mysql client not found and Docker mysql service is not running."
    exit 1
  fi
  for f in "${files[@]}"; do
    echo "   $(basename "$f")"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <"$f"
  done
fi

echo "✓ Migrations applied."
echo "   Restart API: pm2 restart abc-api   (or: docker compose restart api)"
