-- Function to check if a user is a system admin (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN v_role = 'system_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is a school admin (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_school_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN v_role = 'school_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies on profiles to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "System Admins can do everything on profiles" ON public.profiles;

-- Re-create policies using the secure functions
-- 1. View: Everyone can view profiles (needed for checking roles, etc., or restrict if preferred)
--    Actually, for security, maybe only view own or if admin. 
--    Let's stick to: Users can view their own, Admins can view all.
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "System Admins can view all profiles" ON public.profiles
  FOR SELECT USING (is_system_admin());

-- 2. Insert: trigger handles this usually, but allow users to insert their own if manual
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Update: Users can update own, Admins can update all
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "System Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (is_system_admin());

-- 4. Delete: Only admins
CREATE POLICY "System Admins can delete profiles" ON public.profiles
  FOR DELETE USING (is_system_admin());

-- Fix Schools RLS as well just in case
DROP POLICY IF EXISTS "Schools are viewable by everyone" ON public.schools;
CREATE POLICY "Schools are viewable by everyone" ON public.schools
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System Admins can insert schools" ON public.schools;
CREATE POLICY "System Admins can insert schools" ON public.schools
  FOR INSERT WITH CHECK (is_system_admin());

DROP POLICY IF EXISTS "System Admins can update schools" ON public.schools;
CREATE POLICY "System Admins can update schools" ON public.schools
  FOR UPDATE USING (is_system_admin());

DROP POLICY IF EXISTS "System Admins can delete schools" ON public.schools;
CREATE POLICY "System Admins can delete schools" ON public.schools
  FOR DELETE USING (is_system_admin());
