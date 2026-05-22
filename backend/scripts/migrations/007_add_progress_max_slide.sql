-- Furthest slide reached (for completion %); slideIndex is resume position.
ALTER TABLE progress ADD COLUMN maxSlideIndex INT NOT NULL DEFAULT 0;
UPDATE progress SET maxSlideIndex = GREATEST(maxSlideIndex, slideIndex);
