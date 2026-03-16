-- Add username to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Convert empty strings to NULL to avoid duplicate key errors for unique indexes
UPDATE profiles SET username = NULL WHERE username = '';
UPDATE profiles SET phone_number = NULL WHERE phone_number = '';

-- Create a unique index for username
DROP INDEX IF EXISTS idx_profiles_username;
CREATE UNIQUE INDEX idx_profiles_username ON profiles(username) WHERE (username IS NOT NULL AND username <> '');

-- Create a unique index for phone_number
DROP INDEX IF EXISTS idx_profiles_phone_number;
CREATE UNIQUE INDEX idx_profiles_phone_number ON profiles(phone_number) WHERE (phone_number IS NOT NULL AND phone_number <> '');

-- Function to get email by any valid identifier (student_number, username, or phone_number)
-- This function is SECURITY DEFINER to allow unauthenticated access for login lookup
CREATE OR REPLACE FUNCTION get_email_by_identifier(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT au.email
    INTO v_email
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE p.student_number = p_identifier
       OR p.username = p_identifier
       OR p.phone_number = p_identifier;
    
    RETURN v_email;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_email_by_identifier(TEXT) TO anon, authenticated, service_role;
