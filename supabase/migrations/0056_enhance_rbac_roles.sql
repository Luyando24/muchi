
-- Update is_school_admin() to include new granular roles
CREATE OR REPLACE FUNCTION is_school_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() 
    AND role IN ('school_admin', 'bursar', 'registrar', 'exam_officer', 'academic_auditor', 'accounts', 'content_manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_my_school_id() to include new granular roles
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
DECLARE
  sid UUID;
BEGIN
  SELECT school_id INTO sid
  FROM profiles
  WHERE id = auth.uid() 
  AND role IN ('school_admin', 'bursar', 'registrar', 'exam_officer', 'academic_auditor', 'accounts', 'content_manager');
  RETURN sid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure RLS policies are using these functions (they should be already, but this migration confirms the logic)
COMMENT ON FUNCTION is_school_admin() IS 'Returns true if the current user has any administrative role.';
COMMENT ON FUNCTION get_my_school_id() IS 'Returns the school_id for the current administrative user.';
