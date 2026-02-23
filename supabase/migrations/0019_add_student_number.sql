-- Add student_number to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_number TEXT;

-- Create a unique index for student_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_number ON profiles(student_number) WHERE student_number IS NOT NULL;

-- Function to get email by student number
-- This function is SECURITY DEFINER to allow unauthenticated access for login lookup
CREATE OR REPLACE FUNCTION get_email_by_student_number(p_student_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT au.email
    INTO v_email
    FROM profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE p.student_number = p_student_number;
    
    RETURN v_email;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_email_by_student_number(TEXT) TO anon, authenticated, service_role;
