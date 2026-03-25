-- Add secondary_role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_role user_role;

-- Automatically assign 'teacher' as secondary role for all existing school admins
UPDATE profiles 
SET secondary_role = 'teacher' 
WHERE role = 'school_admin' AND secondary_role IS NULL;
