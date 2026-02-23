-- Add qualifications to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qualifications TEXT[];
