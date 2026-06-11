-- Migration: Database Performance Remediation
-- Description: Optimizes query execution speed by:
--   1. Redefining volatile PL/pgSQL RLS helper functions as STABLE SQL functions to support query caching.
--   2. Recreating RLS policies to wrap function calls in subqueries (e.g. (select public.is_school_admin())), forcing evaluation once per query instead of per row.
--   3. Adding composite and covering indexes on profiles, enrollments, and student_grades.

-- ========================================================
-- 1. Drop existing RLS policies referencing the helper functions
-- ========================================================

-- Table: activity_logs
DROP POLICY IF EXISTS "School Admins view logs" ON public.activity_logs;

-- Table: announcements
DROP POLICY IF EXISTS "School Admins manage announcements" ON public.announcements;

-- Table: approvals
DROP POLICY IF EXISTS "School Admins manage approvals" ON public.approvals;

-- Table: calendar_events
DROP POLICY IF EXISTS "School admins can delete their school's calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "School admins can insert calendar events for their school" ON public.calendar_events;
DROP POLICY IF EXISTS "School admins can update their school's calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "School admins can view their school's calendar events" ON public.calendar_events;

-- Table: classes
DROP POLICY IF EXISTS "School Admins manage classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers view assigned classes" ON public.classes;

-- Table: enrollments
DROP POLICY IF EXISTS "School Admins manage enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers view enrollments" ON public.enrollments;

-- Table: fee_payments
DROP POLICY IF EXISTS "School Admins manage fee_payments" ON public.fee_payments;

-- Table: fee_structures
DROP POLICY IF EXISTS "School Admins manage fee_structures" ON public.fee_structures;

-- Table: feeding_program_deliveries
DROP POLICY IF EXISTS "Admins manage deliveries" ON public.feeding_program_deliveries;

-- Table: feeding_program_inventory
DROP POLICY IF EXISTS "Admins manage inventory" ON public.feeding_program_inventory;

-- Table: feeding_program_meals
DROP POLICY IF EXISTS "Admins manage meals" ON public.feeding_program_meals;

-- Table: feeding_program_procurements
DROP POLICY IF EXISTS "Admins manage procurements" ON public.feeding_program_procurements;

-- Table: finance_records
DROP POLICY IF EXISTS "School Admins manage finance" ON public.finance_records;

-- Table: profiles
DROP POLICY IF EXISTS "School Admins can manage school profiles" ON public.profiles;
DROP POLICY IF EXISTS "System Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Table: reports
DROP POLICY IF EXISTS "School Admins manage reports" ON public.reports;

-- Table: school_licenses
DROP POLICY IF EXISTS "School Admins can view own school license" ON public.school_licenses;
DROP POLICY IF EXISTS "System Admins can manage all licenses" ON public.school_licenses;

-- Table: schools
DROP POLICY IF EXISTS "School Admins can update their own school" ON public.schools;
DROP POLICY IF EXISTS "System Admins can manage schools" ON public.schools;

-- Table: student_applications
DROP POLICY IF EXISTS "School Admins delete applications" ON public.student_applications;
DROP POLICY IF EXISTS "School Admins manage applications" ON public.student_applications;
DROP POLICY IF EXISTS "School Admins view applications" ON public.student_applications;

-- Table: student_invoices
DROP POLICY IF EXISTS "School Admins manage student_invoices" ON public.student_invoices;


-- ========================================================
-- 2. Drop and recreate RLS helper functions as STABLE SQL
-- ========================================================

DROP FUNCTION IF EXISTS public.is_system_admin();
DROP FUNCTION IF EXISTS public.is_school_admin();
DROP FUNCTION IF EXISTS public.get_my_school_id();

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'system_admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_school_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'school_admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT school_id FROM public.profiles
  WHERE id = (SELECT auth.uid()) AND role = 'school_admin'::public.user_role
  LIMIT 1;
$$;


-- ========================================================
-- 3. Recreate RLS policies with subquery caching
-- ========================================================

-- Table: activity_logs
CREATE POLICY "School Admins view logs" ON public.activity_logs
  FOR SELECT USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: announcements
CREATE POLICY "School Admins manage announcements" ON public.announcements
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: approvals
CREATE POLICY "School Admins manage approvals" ON public.approvals
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: calendar_events
CREATE POLICY "School admins can delete their school's calendar events" ON public.calendar_events
  FOR DELETE USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

CREATE POLICY "School admins can insert calendar events for their school" ON public.calendar_events
  FOR INSERT WITH CHECK (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

CREATE POLICY "School admins can update their school's calendar events" ON public.calendar_events
  FOR UPDATE USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

CREATE POLICY "School admins can view their school's calendar events" ON public.calendar_events
  FOR SELECT USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: classes
CREATE POLICY "School Admins manage classes" ON public.classes
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

CREATE POLICY "Teachers view assigned classes" ON public.classes
  FOR SELECT USING (
    (auth.uid() = teacher_id) OR ((SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id()))
  );

-- Table: enrollments
CREATE POLICY "School Admins manage enrollments" ON public.enrollments
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND 
    ((SELECT c.school_id FROM public.classes c WHERE c.id = enrollments.class_id) = (SELECT public.get_my_school_id()))
  );

CREATE POLICY "Teachers view enrollments" ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) 
        AND (p.role = 'teacher'::public.user_role OR p.role = 'school_admin'::public.user_role)
        AND p.school_id = (SELECT c.school_id FROM public.classes c WHERE c.id = enrollments.class_id)
    )
  );

-- Table: fee_payments
CREATE POLICY "School Admins manage fee_payments" ON public.fee_payments
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: fee_structures
CREATE POLICY "School Admins manage fee_structures" ON public.fee_structures
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: feeding_program_deliveries
CREATE POLICY "Admins manage deliveries" ON public.feeding_program_deliveries
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: feeding_program_inventory
CREATE POLICY "Admins manage inventory" ON public.feeding_program_inventory
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: feeding_program_meals
CREATE POLICY "Admins manage meals" ON public.feeding_program_meals
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: feeding_program_procurements
CREATE POLICY "Admins manage procurements" ON public.feeding_program_procurements
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: finance_records
CREATE POLICY "School Admins manage finance" ON public.finance_records
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: profiles
CREATE POLICY "School Admins can manage school profiles" ON public.profiles
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

CREATE POLICY "System Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    (SELECT public.is_system_admin())
  );

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    (SELECT auth.uid()) = id
  );

-- Table: reports
CREATE POLICY "School Admins manage reports" ON public.reports
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: school_licenses
CREATE POLICY "School Admins can view own school license" ON public.school_licenses
  FOR SELECT USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

CREATE POLICY "System Admins can manage all licenses" ON public.school_licenses
  FOR ALL USING (
    (SELECT public.is_system_admin())
  );

-- Table: schools
CREATE POLICY "School Admins can update their own school" ON public.schools
  FOR UPDATE USING (
    (SELECT public.is_school_admin()) AND id = (SELECT public.get_my_school_id())
  );

CREATE POLICY "System Admins can manage schools" ON public.schools
  FOR ALL USING (
    (SELECT public.is_system_admin())
  );

-- Table: student_applications
CREATE POLICY "School Admins delete applications" ON public.student_applications
  FOR DELETE USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

CREATE POLICY "School Admins manage applications" ON public.student_applications
  FOR UPDATE USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

CREATE POLICY "School Admins view applications" ON public.student_applications
  FOR SELECT USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );

-- Table: student_invoices
CREATE POLICY "School Admins manage student_invoices" ON public.student_invoices
  FOR ALL USING (
    (SELECT public.is_school_admin()) AND school_id = (SELECT public.get_my_school_id())
  );


-- ========================================================
-- 4. Create composite and covering indexes
-- ========================================================

-- Speed up directory listings, role-based checks, and ordering by name
CREATE INDEX IF NOT EXISTS idx_profiles_school_role_full_name 
  ON public.profiles (school_id, role, full_name);

-- Speed up general school-based queries on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_school_id 
  ON public.profiles (school_id);

-- Covering index to speed up direct RLS membership checks
CREATE INDEX IF NOT EXISTS idx_profiles_id_role_school 
  ON public.profiles (id, role, school_id);

-- Speed up lateral joins and class listings on enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_class_year_student 
  ON public.enrollments (class_id, academic_year, student_id);

-- Speed up term-based academic statistics and charts
CREATE INDEX IF NOT EXISTS idx_student_grades_school_term_percentage 
  ON public.student_grades (school_id, term, percentage);

-- Speed up specific student grade queries with exam type filters
CREATE INDEX IF NOT EXISTS idx_grades_student_lookup 
  ON public.student_grades (student_id, academic_year, term, exam_type);
