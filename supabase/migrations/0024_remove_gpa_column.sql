
-- Remove GPA column from grading_scales table
ALTER TABLE grading_scales DROP COLUMN IF EXISTS gpa_point;
