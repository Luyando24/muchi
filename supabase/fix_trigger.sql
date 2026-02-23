-- Fix Trigger for Profile Creation
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create robust function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_role user_role;
  v_school_id UUID;
BEGIN
  -- Extract metadata with defaults
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'New User');
  
  -- Handle role casting safely
  BEGIN
    v_role := (new.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'student'::user_role;
  END;

  -- Handle school_id casting safely
  BEGIN
    IF (new.raw_user_meta_data->>'school_id') IS NOT NULL AND (new.raw_user_meta_data->>'school_id') != 'none' THEN
      v_school_id := (new.raw_user_meta_data->>'school_id')::UUID;
    ELSE
      v_school_id := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_school_id := NULL;
  END;

  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name, role, school_id)
  VALUES (new.id, v_full_name, v_role, v_school_id)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
