-- Create teacher_leaves table
CREATE TABLE IF NOT EXISTS public.teacher_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Annual Leave', 'Compassionate Leave', 'Study Leave', 'Other')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_leaves ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "System admins can manage leaves" ON public.teacher_leaves;
CREATE POLICY "System admins can manage leaves" ON public.teacher_leaves
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'system_admin')
  );

DROP POLICY IF EXISTS "School admins can manage leaves" ON public.teacher_leaves;
CREATE POLICY "School admins can manage leaves" ON public.teacher_leaves
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'school_admin' 
      AND school_id = teacher_leaves.school_id
    )
  );

DROP POLICY IF EXISTS "Teachers can view/create own leaves" ON public.teacher_leaves;
CREATE POLICY "Teachers can view/create own leaves" ON public.teacher_leaves
  FOR ALL USING (
    auth.uid() = teacher_id
  );
