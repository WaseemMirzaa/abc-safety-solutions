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
echo "To create/reset the admin account later:"
echo "  docker compose exec api node dist/scripts/create-admin-user.js"
