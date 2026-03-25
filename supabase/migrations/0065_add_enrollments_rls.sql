-- Migration 0065: Add RLS policies for common access to enrollments
-- This fixes the issue where Result Printer was unable to fetch students via the browser client.

-- Ensure RLS is enabled
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- 1. School Admins: Full access within their school
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'School Admins manage enrollments') THEN
        CREATE POLICY "School Admins manage enrollments" 
        ON enrollments FOR ALL USING (
          is_school_admin() 
          AND (
            SELECT school_id FROM classes WHERE id = class_id
          ) = get_my_school_id()
        );
    END IF;
END $$;

-- 2. Teachers and Admins: View all enrollments in their school
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers view enrollments') THEN
        CREATE POLICY "Teachers view enrollments" 
        ON enrollments FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (role = 'teacher' OR role = 'school_admin')
            AND school_id = (SELECT school_id FROM classes WHERE id = enrollments.class_id)
          )
        );
    END IF;
END $$;

-- 3. Students: View their own enrollments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students view own enrollments') THEN
        CREATE POLICY "Students view own enrollments" 
        ON enrollments FOR SELECT USING (
          auth.uid() = student_id
        );
    END IF;
END $$;
