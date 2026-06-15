#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  deploy.sh — update production (PM2 or Docker)
#
#  PM2 (Hostinger / nginx + frontend/dist):
#    bash scripts/deploy.sh --pm2
#
#  Docker Compose:
#    bash scripts/deploy.sh --docker
#
#  Auto-detect (PM2 if abc-api is registered, else Docker if api container up):
#    bash scripts/deploy.sh
#
#  First deploy admin user:
#    bash scripts/deploy.sh --pm2 --create-admin
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CREATE_ADMIN=false
DEPLOY_MODE=""
for arg in "$@"; do
  case "$arg" in
    --create-admin) CREATE_ADMIN=true ;;
    --pm2) DEPLOY_MODE=pm2 ;;
    --docker) DEPLOY_MODE=docker ;;
  esac
done

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $(pwd)."
  echo "       Copy .env.example to .env and fill in all CHANGE_THIS values."
  exit 1
fi

resolve_deploy_mode() {
  if [ -n "$DEPLOY_MODE" ]; then
    return 0
  fi
  if docker compose ps api 2>/dev/null | grep -q 'Up'; then
    DEPLOY_MODE=docker
  elif command -v pm2 >/dev/null 2>&1 && pm2 describe abc-api >/dev/null 2>&1; then
    DEPLOY_MODE=pm2
  elif command -v pm2 >/dev/null 2>&1; then
    DEPLOY_MODE=pm2
  else
    DEPLOY_MODE=docker
  fi
}

resolve_deploy_mode
echo "==> Deploy mode: $DEPLOY_MODE"

echo "==> Pulling latest code..."
git pull origin main

run_migrations() {
  if [ -f scripts/run-db-migrations.sh ]; then
    echo "==> Database migrations (required)..."
    bash scripts/run-db-migrations.sh
  fi
}

recalc_durations() {
  echo "==> Recalculating course durations (15s per slide/page)..."
  if [ "$DEPLOY_MODE" = docker ]; then
    if docker compose exec -T api node dist/scripts/recalculate-course-durations.js; then
      echo "   Course durationMinutes updated where needed"
    else
      echo "WARN: duration recalc failed — API may still recalc on next startup"
    fi
  else
    cd "$ROOT/backend"
    npm run build
    if node dist/scripts/recalculate-course-durations.js; then
      echo "   Course durationMinutes updated where needed"
    else
      echo "WARN: duration recalc failed — API may still recalc on next startup"
    fi
    cd "$ROOT"
  fi
}

deploy_pm2() {
  run_migrations

  echo "==> Building frontend..."
  cd "$ROOT/frontend"
  npm run build

  recalc_durations

  echo "==> Restarting API (pm2)..."
  pm2 restart abc-api

  if [ "$CREATE_ADMIN" = true ]; then
    echo "==> Creating admin user..."
    cd "$ROOT/backend"
    node dist/scripts/create-admin-user.js
    cd "$ROOT"
  fi

  echo ""
  echo "✓ PM2 deployment complete."
  pm2 status abc-api || pm2 status
  echo ""
  echo "Post-deploy:"
  echo "  • Frontend: $ROOT/frontend/dist (served by nginx)"
  echo "  • API: pm2 restart abc-api"
  echo "  • Course player: 15-second dwell per PDF page (amber timer bar)"
  echo "  • Recalc durations anytime: bash scripts/recalculate-course-durations.sh"
  echo "Create/reset admin:"
  echo "  cd backend && node dist/scripts/create-admin-user.js"
}

deploy_docker() {
  echo "==> Building containers..."
  docker compose build --no-cache api web

  echo "==> Starting services..."
  docker compose up -d

  run_migrations
  recalc_durations

  echo "==> Verifying PDF tools in API container..."
  if docker compose exec -T api sh -c 'command -v pdftoppm >/dev/null && command -v soffice >/dev/null'; then
    echo "   poppler-utils + LibreOffice OK"
  else
    echo "ERROR: API image missing pdftoppm or LibreOffice — rebuild: docker compose build --no-cache api"
    exit 1
  fi

  echo "==> Verifying nginx WebSocket proxy (socket.io)..."
  if grep -q 'location /socket.io/' frontend/nginx.conf 2>/dev/null; then
    echo "   frontend/nginx.conf includes /socket.io/ proxy"
  else
    echo "WARN: Add socket.io proxy to frontend/nginx.conf for live notifications"
  fi

  echo "==> Waiting for API to be healthy..."
  for i in $(seq 1 20); do
    if docker compose exec -T api node -e "process.exit(0)" 2>/dev/null; then
      break
    fi
    echo "   waiting... ($i/20)"
    sleep 3
  done

  if [ "$CREATE_ADMIN" = true ]; then
    echo "==> Creating admin user..."
    docker compose exec -T api node dist/scripts/create-admin-user.js
  fi

  echo ""
  echo "✓ Docker deployment complete."
  docker compose ps
  echo ""
  echo "Post-deploy:"
  echo "  • Re-save each course in Admin → Courses so PDF playlists convert to slides."
  echo "  • Course player: 15-second dwell per PDF page (amber timer bar shown)."
  echo "To create/reset the admin account later:"
  echo "  docker compose exec api node dist/scripts/create-admin-user.js"
}

if [ "$DEPLOY_MODE" = pm2 ]; then
  deploy_pm2
else
  deploy_docker
fi
