-- Update get_email_by_identifier to include staff_number for unified login
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
       OR p.staff_number = p_identifier
       OR p.username = p_identifier
       OR p.phone_number = p_identifier;
    
    RETURN v_email;
END;
$$;

-- Grant execute permission to ensure consistent access control
GRANT EXECUTE ON FUNCTION get_email_by_identifier(TEXT) TO anon, authenticated, service_role;
