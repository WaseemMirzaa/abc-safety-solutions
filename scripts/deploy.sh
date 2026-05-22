#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  deploy.sh
#  Run on the Digital Ocean droplet from the project root to deploy / update.
#
#  First deploy:
#    bash scripts/deploy.sh --create-admin
#
#  Subsequent updates:
#    bash scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CREATE_ADMIN=false
for arg in "$@"; do
  [[ "$arg" == "--create-admin" ]] && CREATE_ADMIN=true
done

# Verify .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env not found in $(pwd)."
  echo "       Copy .env.example to .env and fill in all CHANGE_THIS values."
  exit 1
fi

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building containers..."
docker compose build --no-cache api web

echo "==> Starting services..."
docker compose up -d

if [ -f scripts/run-db-migrations.sh ]; then
  echo "==> Database migrations (required)..."
  bash scripts/run-db-migrations.sh
fi

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
echo "✓ Deployment complete."
docker compose ps
echo ""
echo "Site is live on port 80."
echo ""
echo "Post-deploy:"
echo "  • Re-save each course in Admin → Courses so PDF playlists convert to slides."
echo "  • Learners: 3 knowledge-check attempts per purchase (not 3 full course views)."
echo "To create/reset the admin account later:"
echo "  docker compose exec api node dist/scripts/create-admin-user.js"
