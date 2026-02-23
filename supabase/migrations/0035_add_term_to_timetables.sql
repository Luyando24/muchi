-- Add academic_year and term to timetables
ALTER TABLE timetables 
ADD COLUMN IF NOT EXISTS academic_year TEXT,
ADD COLUMN IF NOT EXISTS term TEXT;

-- Add academic_year and term to attendance (optional but good for filtering)
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS academic_year TEXT,
ADD COLUMN IF NOT EXISTS term TEXT;

-- Add academic_year and term to reports (for future filtering)
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS academic_year TEXT,
ADD COLUMN IF NOT EXISTS term TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_timetables_year_term ON timetables(academic_year, term);
CREATE INDEX IF NOT EXISTS idx_attendance_year_term ON attendance(academic_year, term);
CREATE INDEX IF NOT EXISTS idx_reports_year_term ON reports(academic_year, term);

-- Backfill timetables with current school settings
UPDATE timetables t
SET 
  academic_year = s.academic_year,
  term = s.current_term
FROM schools s
WHERE t.school_id = s.id
AND t.academic_year IS NULL;
