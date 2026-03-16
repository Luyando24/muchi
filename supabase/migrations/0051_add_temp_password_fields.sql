-- Migration 0051: Add Temporary Password Fields to Profiles

-- Add is_temp_password column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_temp_password') THEN
        ALTER TABLE profiles ADD COLUMN is_temp_password BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add temp_password_set_at column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'temp_password_set_at') THEN
        ALTER TABLE profiles ADD COLUMN temp_password_set_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add temp_password_expires_at column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'temp_password_expires_at') THEN
        ALTER TABLE profiles ADD COLUMN temp_password_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add index for performance on expiration checks
CREATE INDEX IF NOT EXISTS idx_temp_password_expires ON profiles(temp_password_expires_at) WHERE is_temp_password = TRUE;
