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
