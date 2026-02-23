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
