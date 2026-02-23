
-- Add teacher-specific fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS subjects TEXT[],
ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'Active';

-- Create index for faster filtering by role and school (already done in 0002, but good to be safe or just skip)
-- The index `idx_profiles_role_school` covers role and school_id, which is what we need for teachers too.
