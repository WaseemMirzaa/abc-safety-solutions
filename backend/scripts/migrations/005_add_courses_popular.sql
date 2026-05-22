-- Mark courses for homepage "Popular online courses" section (admin checkbox).
ALTER TABLE courses ADD COLUMN popular TINYINT(1) NOT NULL DEFAULT 0;
