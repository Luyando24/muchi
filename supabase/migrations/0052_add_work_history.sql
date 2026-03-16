-- Add work_history to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;
