-- Migration: Fix subjects and class_subjects RLS policies
-- Description: Enables proper frontend querying by defining select and all policies for subjects and class_subjects

-- Drop existing policies if any
DROP POLICY IF EXISTS "School members can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "School admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "School staff can view class subjects" ON public.class_subjects;
DROP POLICY IF EXISTS "School admins can manage class subjects" ON public.class_subjects;

-- Create policies for subjects
CREATE POLICY "School members can view subjects" ON public.subjects
  FOR SELECT USING (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "School admins can manage subjects" ON public.subjects
  FOR ALL USING (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'school_admin'::public.user_role)
  );

-- Create policies for class_subjects
CREATE POLICY "School staff can view class subjects" ON public.class_subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_subjects.class_id
      AND c.school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

CREATE POLICY "School admins can manage class subjects" ON public.class_subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_subjects.class_id
      AND c.school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'school_admin'::public.user_role)
    )
  );
