-- Add staff_number to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS staff_number TEXT;

-- Create a unique index for staff_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_staff_number ON profiles(staff_number) WHERE staff_number IS NOT NULL;

-- Function to get email by staff number
-- This function is SECURITY DEFINER to allow unauthenticated access for login lookup
CREATE OR REPLACE FUNCTION get_email_by_staff_number(p_staff_number TEXT)
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
    WHERE p.staff_number = p_staff_number;
    
    RETURN v_email;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_email_by_staff_number(TEXT) TO anon, authenticated, service_role;
