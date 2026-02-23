
-- Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
