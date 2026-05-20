-- Run once on existing production DBs created before the slides column was added.
-- Example:
--   docker compose exec -T mysql mysql -u abc -p abc_portal < backend/scripts/migrations/001_add_courses_slides.sql

ALTER TABLE `courses`
  ADD COLUMN IF NOT EXISTS `slides` JSON NULL;
