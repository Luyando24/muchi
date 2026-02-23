-- Fix RLS Infinite Recursion
-- The issue is that RLS policies on 'profiles' query 'profiles' table itself to check for admin role.
-- This creates a loop.
-- Solution: Create a SECURITY DEFINER function to check role, which bypasses RLS.

-- 1. Create a function to check if user is system admin
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'system_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to check if user is school admin
CREATE OR REPLACE FUNCTION is_school_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'school_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get School ID for current school admin
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
DECLARE
  sid UUID;
BEGIN
  SELECT school_id INTO sid
  FROM profiles
  WHERE id = auth.uid() AND role = 'school_admin';
  RETURN sid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Update RLS Policies on 'profiles'

-- Drop existing policies to be safe
DROP POLICY IF EXISTS "System Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "School Admins can manage school profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Re-create with function calls

CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "System Admins can manage all profiles" 
ON profiles FOR ALL USING (
  is_system_admin()
);

CREATE POLICY "School Admins can manage school profiles" 
ON profiles FOR ALL USING (
  is_school_admin() 
  AND school_id = get_my_school_id()
);


-- 5. Update RLS Policies on 'schools'
DROP POLICY IF EXISTS "System Admins can manage schools" ON schools;
DROP POLICY IF EXISTS "School Admins can update their own school" ON schools;

CREATE POLICY "System Admins can manage schools" 
ON schools FOR ALL USING (
  is_system_admin()
);

CREATE POLICY "School Admins can update their own school" 
ON schools FOR UPDATE USING (
  is_school_admin() 
  AND id = get_my_school_id()
);

-- 6. Update RLS Policies on 'classes'
DROP POLICY IF EXISTS "School Admins manage classes" ON classes;
DROP POLICY IF EXISTS "Teachers view assigned classes" ON classes;

CREATE POLICY "School Admins manage classes" 
ON classes FOR ALL USING (
  is_school_admin() 
  AND school_id = get_my_school_id()
);

CREATE POLICY "Teachers view assigned classes" 
ON classes FOR SELECT USING (
  auth.uid() = teacher_id OR 
  (is_school_admin() AND school_id = get_my_school_id())
);
