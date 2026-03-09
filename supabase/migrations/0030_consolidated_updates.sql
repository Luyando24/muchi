
-- Create class_subjects table
CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Optional: Subject teacher for this class
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);

-- Enable RLS
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "School staff can view class subjects" ON class_subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_subjects.class_id
      AND classes.school_id IN (
        SELECT school_id FROM profiles
        WHERE id = auth.uid() AND role IN ('school_admin', 'teacher', 'student')
      )
    )
  );

CREATE POLICY "School admins can manage class subjects" ON class_subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_subjects.class_id
      AND classes.school_id IN (
        SELECT school_id FROM profiles
        WHERE id = auth.uid() AND role = 'school_admin'
      )
    )
  );
CREATE TABLE IF NOT EXISTS student_subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  academic_year TEXT,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, academic_year)
);

ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School staff can manage student subjects" ON student_subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND school_id = (SELECT school_id FROM profiles WHERE id = student_subjects.student_id)
      AND role IN ('school_admin', 'teacher')
    )
  );

CREATE POLICY "Students can view their own subjects" ON student_subjects
  FOR SELECT USING (auth.uid() = student_id);
-- 1. Drop the incorrect foreign key constraint that references the wrong table (students)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;

-- 2. Delete orphaned attendance records that don't match any profile
-- This prevents the new constraint from failing if there is invalid data
DELETE FROM attendance 
WHERE student_id NOT IN (SELECT id FROM profiles);

-- 3. Add the correct foreign key constraint referencing profiles(id)
ALTER TABLE attendance 
ADD CONSTRAINT attendance_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;
-- 1. Drop the incorrect foreign key constraint for recorded_by
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_recorded_by_fkey;

-- 2. Clean up any bad data (attendance records with invalid recorded_by)
-- This prevents the new constraint from failing if there is invalid data
UPDATE attendance SET recorded_by = NULL 
WHERE recorded_by NOT IN (SELECT id FROM profiles);

-- 3. Add the correct foreign key constraint referencing profiles(id)
ALTER TABLE attendance 
ADD CONSTRAINT attendance_recorded_by_fkey 
FOREIGN KEY (recorded_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Create timetables table
CREATE TABLE IF NOT EXISTS timetables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "School staff can view timetables" ON timetables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND school_id = timetables.school_id 
            AND role IN ('school_admin', 'teacher', 'student')
        )
    );

CREATE POLICY "School admins can manage timetables" ON timetables
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND school_id = timetables.school_id 
            AND role = 'school_admin'
        )
    );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_timetables_school_id ON timetables(school_id);
CREATE INDEX IF NOT EXISTS idx_timetables_class_id ON timetables(class_id);
CREATE INDEX IF NOT EXISTS idx_timetables_teacher_id ON timetables(teacher_id);
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
-- Add calculated_at column to student_grades
ALTER TABLE student_grades
ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ;
-- Update the status check constraint to include 'Submitted'
ALTER TABLE student_grades DROP CONSTRAINT IF EXISTS student_grades_status_check;
ALTER TABLE student_grades ADD CONSTRAINT student_grades_status_check CHECK (status IN ('Draft', 'Submitted', 'Published'));

ALTER TABLE schools ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS seal_url TEXT;

-- Set up storage policies for school-assets bucket
-- Use DROP then CREATE for idempotency in migrations

-- 1. Allow public access to read files
DROP POLICY IF EXISTS "Public Access school-assets" ON storage.objects;
CREATE POLICY "Public Access school-assets" ON storage.objects FOR SELECT USING (bucket_id = 'school-assets');

-- 2. Allow authenticated users to upload files
DROP POLICY IF EXISTS "Auth Upload school-assets" ON storage.objects;
CREATE POLICY "Auth Upload school-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'school-assets' AND auth.role() = 'authenticated');

-- 3. Allow authenticated users to update/delete files
DROP POLICY IF EXISTS "Auth Admin school-assets" ON storage.objects;
CREATE POLICY "Auth Admin school-assets" ON storage.objects FOR ALL USING (bucket_id = 'school-assets' AND auth.role() = 'authenticated');
