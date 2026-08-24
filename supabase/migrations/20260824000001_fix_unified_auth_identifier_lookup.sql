-- Migration: Fix and enhance get_email_by_identifier for robust login resolution
-- Handles email, staff_number, student_number, username, phone_number with trimming and case-insensitivity.
-- Also resolves cases where auth.users has a placeholder/system email while profiles has the user's personal email, or vice versa.

CREATE OR REPLACE FUNCTION get_email_by_identifier(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
    v_clean_identifier TEXT;
BEGIN
    IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
        RETURN NULL;
    END IF;

    v_clean_identifier := TRIM(p_identifier);

    -- 1. Check if the identifier matches auth.users.email directly (case-insensitive)
    SELECT au.email
    INTO v_email
    FROM auth.users au
    WHERE LOWER(au.email) = LOWER(v_clean_identifier)
    LIMIT 1;

    IF v_email IS NOT NULL THEN
        RETURN v_email;
    END IF;

    -- 2. Check if the identifier matches profiles.email (resolving to linked auth.users.email)
    SELECT au.email
    INTO v_email
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE LOWER(p.email) = LOWER(v_clean_identifier)
    LIMIT 1;

    IF v_email IS NOT NULL THEN
        RETURN v_email;
    END IF;

    -- 3. Check if the identifier matches staff_number, student_number, username, or phone_number
    SELECT au.email
    INTO v_email
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE LOWER(p.staff_number) = LOWER(v_clean_identifier)
       OR LOWER(p.student_number) = LOWER(v_clean_identifier)
       OR LOWER(p.username) = LOWER(v_clean_identifier)
       OR p.phone_number = v_clean_identifier
       OR REPLACE(p.phone_number, ' ', '') = REPLACE(v_clean_identifier, ' ', '')
    LIMIT 1;

    RETURN v_email;
END;
$$;

-- Ensure execution permissions
GRANT EXECUTE ON FUNCTION get_email_by_identifier(TEXT) TO anon, authenticated, service_role;

-- Update get_email_by_staff_number with case-insensitivity and trimming
CREATE OR REPLACE FUNCTION get_email_by_staff_number(p_staff_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
BEGIN
    IF p_staff_number IS NULL OR TRIM(p_staff_number) = '' THEN
        RETURN NULL;
    END IF;

    SELECT au.email
    INTO v_email
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE LOWER(p.staff_number) = LOWER(TRIM(p_staff_number))
    LIMIT 1;
    
    RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_email_by_staff_number(TEXT) TO anon, authenticated, service_role;
