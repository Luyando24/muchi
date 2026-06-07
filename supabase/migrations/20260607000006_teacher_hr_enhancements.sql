-- Create teacher_cpd table
CREATE TABLE IF NOT EXISTS public.teacher_cpd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Pedagogy', 'Subject Matter', 'Leadership', 'ICT', 'Special Needs', 'Other')),
  hours INTEGER NOT NULL,
  completion_date DATE NOT NULL,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create teacher_career_history table
CREATE TABLE IF NOT EXISTS public.teacher_career_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  previous_role TEXT,
  new_role TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Promotion', 'Demotion', 'Transfer', 'Role Change', 'Onboarding')),
  change_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.teacher_cpd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_career_history ENABLE ROW LEVEL SECURITY;

-- Policies for teacher_cpd:
-- 1. System Admins have full control
CREATE POLICY "System admins can manage cpd" ON public.teacher_cpd
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'system_admin')
  );

-- 2. Government can view all cpd records
CREATE POLICY "Government can view cpd" ON public.teacher_cpd
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'government' OR secondary_role = 'government'))
  );

-- 3. School Admins can manage cpd for their school
CREATE POLICY "School admins can manage cpd" ON public.teacher_cpd
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'school_admin' 
      AND school_id = teacher_cpd.school_id
    )
  );

-- 4. Teachers can manage (select/insert/update/delete) their own CPD
CREATE POLICY "Teachers can manage own cpd" ON public.teacher_cpd
  FOR ALL USING (
    auth.uid() = teacher_id
  );

-- Policies for teacher_career_history:
-- 1. System Admins can manage all career history
CREATE POLICY "System admins can manage career history" ON public.teacher_career_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'system_admin')
  );

-- 2. Government can view all career history
CREATE POLICY "Government can view career history" ON public.teacher_career_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'government' OR secondary_role = 'government'))
  );

-- 3. School Admins can manage career history for their school
CREATE POLICY "School admins can manage career history" ON public.teacher_career_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'school_admin' 
      AND school_id = teacher_career_history.school_id
    )
  );

-- 4. Teachers can read their own career history
CREATE POLICY "Teachers can view own career history" ON public.teacher_career_history
  FOR SELECT USING (
    auth.uid() = teacher_id
  );
