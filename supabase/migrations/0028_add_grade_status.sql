
-- Add status column to student_grades table
ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published'));
