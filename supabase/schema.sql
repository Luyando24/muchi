-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --- CLEANUP EXISTING TABLES (Run this if you want a fresh start) ---
-- WARNING: This will delete all data in these tables.
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 1. Create User Roles Enum
CREATE TYPE user_role AS ENUM ('system_admin', 'school_admin', 'teacher', 'student');

-- 2. Create Schools Table
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- For school website subdomain/path (e.g., muchi.com/school/chongwe)
  domain TEXT UNIQUE, -- Custom domain if needed
  plan TEXT DEFAULT 'Standard',
  address TEXT,
  logo_url TEXT,
  contact_email TEXT,
  school_type TEXT DEFAULT 'Secondary' CHECK (school_type IN ('Secondary', 'Basic')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Profiles Table (Extensions to Supabase Auth Users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- Null for System Admins
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  date_of_birth DATE,
  phone_number TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Classes Table (Teachers manage classes)
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., "Grade 10A"
  teacher_id UUID REFERENCES profiles(id), -- Assigned Teacher
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Student Enrollment (Linking Students to Classes)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  academic_year TEXT NOT NULL, -- e.g., "2024"
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, academic_year)
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- --- HELPER FUNCTIONS FOR RLS (Fixes Infinite Recursion) ---

-- 1. Check if user is system admin (Security Definer to bypass RLS)
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'system_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Check if user is school admin (Security Definer)
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

-- --- RLS POLICIES ---

-- Schools:
-- - System Admins can do everything.
-- - Public can read (for websites).
-- - School Admins can update their own school.

CREATE POLICY "Public schools are viewable by everyone" 
ON schools FOR SELECT USING (true);

CREATE POLICY "System Admins can manage schools" 
ON schools FOR ALL USING (
  is_system_admin()
);

CREATE POLICY "School Admins can update their own school" 
ON schools FOR UPDATE USING (
  is_school_admin() 
  AND id = get_my_school_id()
);

-- Profiles:
-- - Users can read their own profile.
-- - System Admins can manage all profiles.
-- - School Admins can manage profiles in their school.
-- - Teachers can view students in their school.

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

-- Classes:
-- - School Admins can manage classes.
-- - Teachers can view their classes.
-- - Students can view their classes.

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

-- Functions
-- Function to handle new user creation trigger (Optional, if using Auth Hooks)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, school_id)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', (new.raw_user_meta_data->>'role')::user_role, (new.raw_user_meta_data->>'school_id')::uuid);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
-- Note: This requires the client/backend to pass metadata during signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
