
-- Add student-specific fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS guardian_name TEXT,
ADD COLUMN IF NOT EXISTS guardian_contact TEXT,
ADD COLUMN IF NOT EXISTS enrollment_status TEXT DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS fees_status TEXT DEFAULT 'Pending';

-- Create index for faster filtering by role and school
CREATE INDEX IF NOT EXISTS idx_profiles_role_school ON profiles(role, school_id);
