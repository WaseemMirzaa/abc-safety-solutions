#!/usr/bin/env bash
# Recalculate courses.durationMinutes / slideCount (15s dwell per PDF page / image).
# Run from project root after deploy or when changing LEARNER_SLIDE_DWELL_SEC.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

run_node_recalc() {
  cd "$ROOT/backend"
  if [ ! -f dist/scripts/recalculate-course-durations.js ]; then
    npm run build
  fi
  node dist/scripts/recalculate-course-durations.js
}

if command -v pm2 >/dev/null 2>&1 && pm2 describe abc-api >/dev/null 2>&1; then
  run_node_recalc
elif docker compose ps api 2>/dev/null | grep -q 'Up'; then
  docker compose exec -T api node dist/scripts/recalculate-course-durations.js
elif [ -f "$ROOT/backend/dist/scripts/recalculate-course-durations.js" ]; then
  run_node_recalc
else
  echo "Build API first: cd backend && npm run durations:recalc"
  exit 1
fi
