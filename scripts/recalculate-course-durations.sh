#!/usr/bin/env bash
# Recalculate courses.durationMinutes / slideCount (15s dwell per PDF page / image).
# Run from project root after deploy or when changing LEARNER_SLIDE_DWELL_SEC.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if docker compose ps api 2>/dev/null | grep -q 'Up'; then
  docker compose exec -T api node dist/scripts/recalculate-course-durations.js
elif [ -f "$ROOT/backend/dist/scripts/recalculate-course-durations.js" ]; then
  cd "$ROOT/backend" && node dist/scripts/recalculate-course-durations.js
else
  echo "Build API first: cd backend && npm run durations:recalc"
  exit 1
fi
