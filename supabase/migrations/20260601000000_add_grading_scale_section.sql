-- Grading scales: section column (primary-junior / primary-senior / secondary)
-- and allow the same grade letter in different sections per school.

ALTER TABLE grading_scales
  ADD COLUMN IF NOT EXISTS section TEXT;

UPDATE grading_scales
SET section = 'secondary'
WHERE section IS NULL OR trim(section) = '';

ALTER TABLE grading_scales
  ALTER COLUMN section SET DEFAULT 'secondary';

ALTER TABLE grading_scales
  DROP CONSTRAINT IF EXISTS grading_scales_school_id_grade_key;

CREATE UNIQUE INDEX IF NOT EXISTS grading_scales_school_id_grade_section_key
  ON grading_scales (school_id, grade, section);
