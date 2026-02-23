-- Fix attendance table missing columns
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add unique constraint to attendance if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_id_date_key') THEN
        ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date);
    END IF;
END $$;

-- Drop restrictive check constraint on students table
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_card_id_check;
