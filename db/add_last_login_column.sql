-- Add last_login column to staff_users table
ALTER TABLE staff_users ADD COLUMN last_login TIMESTAMPTZ;