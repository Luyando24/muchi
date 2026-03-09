-- Fix attendance table schema
-- This migration adds missing columns that are required by the application

-- 1. Add updated_at column (This is the one causing the specific error)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add other columns that are used in the codebase but might be missing
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS term TEXT;

-- 3. Ensure the unique constraint exists for upsert operations (student_id + date)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_id_date_key') THEN
        ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date);
    END IF;
END $$;
