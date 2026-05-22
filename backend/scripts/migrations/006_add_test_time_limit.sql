-- Time limit for knowledge checks (minutes). 0 = no limit.
ALTER TABLE course_tests ADD COLUMN timeLimitMinutes INT NOT NULL DEFAULT 0;
