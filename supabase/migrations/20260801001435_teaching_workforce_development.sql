-- Teaching workforce development, performance review and promotion workflow.
-- Ministry officers manage these records through the authenticated government API.

CREATE TABLE IF NOT EXISTS public.teacher_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_cycle TEXT NOT NULL,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Finalised'
    CHECK (status IN ('Draft', 'Finalised')),
  lesson_planning_score SMALLINT NOT NULL CHECK (lesson_planning_score BETWEEN 1 AND 5),
  pedagogy_score SMALLINT NOT NULL CHECK (pedagogy_score BETWEEN 1 AND 5),
  subject_knowledge_score SMALLINT NOT NULL CHECK (subject_knowledge_score BETWEEN 1 AND 5),
  assessment_score SMALLINT NOT NULL CHECK (assessment_score BETWEEN 1 AND 5),
  classroom_management_score SMALLINT NOT NULL CHECK (classroom_management_score BETWEEN 1 AND 5),
  learner_support_score SMALLINT NOT NULL CHECK (learner_support_score BETWEEN 1 AND 5),
  professionalism_score SMALLINT NOT NULL CHECK (professionalism_score BETWEEN 1 AND 5),
  overall_score NUMERIC(5, 2) NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  strengths TEXT,
  development_notes TEXT,
  weakness_areas TEXT[] NOT NULL DEFAULT '{}',
  improvement_plan_required BOOLEAN NOT NULL DEFAULT FALSE,
  improvement_deadline DATE,
  improvement_status TEXT NOT NULL DEFAULT 'Not Required'
    CHECK (improvement_status IN ('Not Required', 'Open', 'In Progress', 'Completed', 'Overdue')),
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, review_cycle)
);

CREATE TABLE IF NOT EXISTS public.teacher_training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('Pedagogy', 'Subject Matter', 'Assessment', 'Classroom Management', 'Learner Support', 'Professionalism', 'Leadership', 'ICT', 'Special Needs', 'Other')
  ),
  delivery_mode TEXT NOT NULL DEFAULT 'In-person'
    CHECK (delivery_mode IN ('In-person', 'Online', 'Blended')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours INTEGER NOT NULL CHECK (hours > 0),
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  status TEXT NOT NULL DEFAULT 'Planned'
    CHECK (status IN ('Planned', 'Open', 'In Progress', 'Completed', 'Cancelled')),
  target_weaknesses TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.teacher_training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.teacher_training_programs(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Assigned'
    CHECK (status IN ('Assigned', 'Enrolled', 'In Progress', 'Completed', 'Withdrawn', 'No Show')),
  attendance_percent NUMERIC(5, 2) CHECK (attendance_percent BETWEEN 0 AND 100),
  assessment_score NUMERIC(5, 2) CHECK (assessment_score BETWEEN 0 AND 100),
  completion_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (training_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS public.teacher_promotion_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  previous_role TEXT,
  target_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Recommended'
    CHECK (status IN ('Recommended', 'Approved', 'Declined')),
  readiness_score NUMERIC(5, 2) NOT NULL CHECK (readiness_score BETWEEN 0 AND 100),
  criteria_met BOOLEAN NOT NULL DEFAULT FALSE,
  criteria_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision_notes TEXT,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_performance_reviews_teacher_date
  ON public.teacher_performance_reviews (teacher_id, review_date DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_performance_reviews_school_status
  ON public.teacher_performance_reviews (school_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_training_programs_status_dates
  ON public.teacher_training_programs (status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_teacher_training_assignments_teacher_status
  ON public.teacher_training_assignments (teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_training_assignments_training_status
  ON public.teacher_training_assignments (training_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_promotion_cases_teacher_created
  ON public.teacher_promotion_cases (teacher_id, created_at DESC);

DROP TRIGGER IF EXISTS update_teacher_performance_reviews_updated_at ON public.teacher_performance_reviews;
CREATE TRIGGER update_teacher_performance_reviews_updated_at
  BEFORE UPDATE ON public.teacher_performance_reviews
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_training_programs_updated_at ON public.teacher_training_programs;
CREATE TRIGGER update_teacher_training_programs_updated_at
  BEFORE UPDATE ON public.teacher_training_programs
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_training_assignments_updated_at ON public.teacher_training_assignments;
CREATE TRIGGER update_teacher_training_assignments_updated_at
  BEFORE UPDATE ON public.teacher_training_assignments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_promotion_cases_updated_at ON public.teacher_promotion_cases;
CREATE TRIGGER update_teacher_promotion_cases_updated_at
  BEFORE UPDATE ON public.teacher_promotion_cases
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

ALTER TABLE public.teacher_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_promotion_cases ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_performance_reviews TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_training_programs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_training_assignments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_promotion_cases TO authenticated, service_role;

DROP POLICY IF EXISTS "Government officers manage performance reviews" ON public.teacher_performance_reviews;
CREATE POLICY "Government officers manage performance reviews"
  ON public.teacher_performance_reviews FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  );

DROP POLICY IF EXISTS "Teachers view own performance reviews" ON public.teacher_performance_reviews;
CREATE POLICY "Teachers view own performance reviews"
  ON public.teacher_performance_reviews FOR SELECT TO authenticated
  USING (teacher_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Government officers manage training programs" ON public.teacher_training_programs;
CREATE POLICY "Government officers manage training programs"
  ON public.teacher_training_programs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  );

DROP POLICY IF EXISTS "Government officers manage training assignments" ON public.teacher_training_assignments;
CREATE POLICY "Government officers manage training assignments"
  ON public.teacher_training_assignments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  );

DROP POLICY IF EXISTS "Teachers view own training assignments" ON public.teacher_training_assignments;
CREATE POLICY "Teachers view own training assignments"
  ON public.teacher_training_assignments FOR SELECT TO authenticated
  USING (teacher_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Teachers view assigned training programs" ON public.teacher_training_programs;
CREATE POLICY "Teachers view assigned training programs"
  ON public.teacher_training_programs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_training_assignments assignment
      WHERE assignment.training_id = teacher_training_programs.id
        AND assignment.teacher_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Government officers manage promotion cases" ON public.teacher_promotion_cases;
CREATE POLICY "Government officers manage promotion cases"
  ON public.teacher_promotion_cases FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  );

DROP POLICY IF EXISTS "Teachers view own promotion cases" ON public.teacher_promotion_cases;
CREATE POLICY "Teachers view own promotion cases"
  ON public.teacher_promotion_cases FOR SELECT TO authenticated
  USING (teacher_id = (SELECT auth.uid()));

INSERT INTO public.system_settings (key, value, description)
VALUES
  ('gov_performance_weakness_score', '60', 'Competency percentage below which a development weakness is flagged'),
  ('gov_promotion_min_performance_score', '70', 'Minimum latest finalised performance score required for promotion'),
  ('gov_promotion_min_cpd_hours', '40', 'Minimum completed professional development hours in the review period'),
  ('gov_promotion_review_period_months', '24', 'Lookback period used for promotion performance and training evidence')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.finalise_teacher_promotion(
  p_case_id UUID,
  p_decision TEXT,
  p_decision_notes TEXT,
  p_effective_date DATE,
  p_decided_by UUID
)
RETURNS public.teacher_promotion_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  promotion_case public.teacher_promotion_cases;
  decision_maker_authorised BOOLEAN;
BEGIN
  IF p_decision NOT IN ('Approved', 'Declined') THEN
    RAISE EXCEPTION 'Decision must be Approved or Declined';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_decided_by
      AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
  ) INTO decision_maker_authorised;

  IF NOT decision_maker_authorised THEN
    RAISE EXCEPTION 'Decision maker is not authorised';
  END IF;

  SELECT * INTO promotion_case
  FROM public.teacher_promotion_cases
  WHERE id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion case not found';
  END IF;

  IF promotion_case.status <> 'Recommended' THEN
    RAISE EXCEPTION 'Promotion case has already been decided';
  END IF;

  IF p_decision = 'Approved' AND NOT promotion_case.criteria_met THEN
    RAISE EXCEPTION 'Promotion criteria are not met';
  END IF;

  UPDATE public.teacher_promotion_cases
  SET status = p_decision,
      decision_notes = NULLIF(trim(p_decision_notes), ''),
      decided_by = p_decided_by,
      decided_at = now(),
      effective_date = CASE WHEN p_decision = 'Approved' THEN p_effective_date ELSE NULL END
  WHERE id = p_case_id
  RETURNING * INTO promotion_case;

  IF p_decision = 'Approved' THEN
    UPDATE public.profiles
    SET "current_role" = promotion_case.target_role,
        updated_at = now()
    WHERE id = promotion_case.teacher_id;

    INSERT INTO public.teacher_career_history (
      teacher_id,
      school_id,
      previous_role,
      new_role,
      type,
      change_date,
      notes
    ) VALUES (
      promotion_case.teacher_id,
      promotion_case.school_id,
      promotion_case.previous_role,
      promotion_case.target_role,
      'Promotion',
      p_effective_date,
      NULLIF(trim(p_decision_notes), '')
    );
  END IF;

  RETURN promotion_case;
END;
$$;

REVOKE ALL ON FUNCTION public.finalise_teacher_promotion(UUID, TEXT, TEXT, DATE, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalise_teacher_promotion(UUID, TEXT, TEXT, DATE, UUID) TO service_role;

COMMENT ON TABLE public.teacher_performance_reviews IS 'Structured teacher reviews used to identify competency weaknesses and improvement actions.';
COMMENT ON TABLE public.teacher_training_programs IS 'Ministry-managed professional development programmes mapped to workforce development needs.';
COMMENT ON TABLE public.teacher_training_assignments IS 'Teacher participation and completion tracking for ministry training programmes.';
COMMENT ON TABLE public.teacher_promotion_cases IS 'Auditable promotion recommendations and decisions with a snapshot of the criteria applied.';
