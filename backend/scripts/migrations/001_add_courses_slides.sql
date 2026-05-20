-- Adds courses.slides (JSON). Prefer: bash scripts/run-db-migrations.sh (skips if column exists).
-- Manual (MySQL 5.7+): only run if the column is missing.

ALTER TABLE `courses` ADD COLUMN `slides` JSON NULL;
