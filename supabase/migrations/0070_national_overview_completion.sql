
-- 0070_national_overview_completion.sql

-- 1. Add province and district columns to schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS district TEXT;

-- 2. Seed some sample data for existing schools (for demonstration)
UPDATE schools SET province = 'Lusaka', district = 'Lusaka District' WHERE province IS NULL;
UPDATE schools SET province = 'Copperbelt', district = 'Ndola' WHERE id IN (SELECT id FROM schools LIMIT 2 OFFSET 1); -- Mix it up a bit

-- 3. Update RLS policies for Government Role Access
-- Schools: Government can view all schools
DO $$ BEGIN
  CREATE POLICY "Government view all schools" ON schools
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'system_admin' OR role = 'government' OR secondary_role = 'government')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profiles: Government can view all profiles (for teacher/student counts)
DO $$ BEGIN
  CREATE POLICY "Government view all profiles" ON profiles
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM profiles p2
        WHERE p2.id = auth.uid() AND (p2.role = 'system_admin' OR p2.role = 'government' OR p2.secondary_role = 'government')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Attendance: Government can view all attendance
DO $$ BEGIN
  CREATE POLICY "Government view all attendance" ON attendance
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'system_admin' OR role = 'government' OR secondary_role = 'government')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Student Grades: Government can view all grades
DO $$ BEGIN
  CREATE POLICY "Government view all grades" ON student_grades
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'system_admin' OR role = 'government' OR secondary_role = 'government')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
