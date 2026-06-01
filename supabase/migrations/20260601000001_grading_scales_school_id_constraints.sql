-- Ensure every custom grading scale row is owned by exactly one school.

DELETE FROM grading_scales WHERE school_id IS NULL;

ALTER TABLE grading_scales
  ALTER COLUMN school_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_grading_scales_school_id
  ON grading_scales (school_id);

COMMENT ON COLUMN grading_scales.school_id IS
  'Owning school; all custom scales are isolated per school.';
