-- Migration 0060: Add Temporary Password Plaintext Column
-- This column will store the simple random password generated during student creation,
-- allowing administrators to view and share it until the student resets it.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'temp_password') THEN
        ALTER TABLE profiles ADD COLUMN temp_password TEXT;
    END IF;
END $$;
