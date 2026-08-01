-- Independent, anonymous confirmations for the national school feeding programme.
-- Public submissions are accepted only through the rate-limited server endpoint.

CREATE TABLE IF NOT EXISTS public.feeding_program_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  reporter_type TEXT NOT NULL
    CHECK (reporter_type IN ('Parent', 'Pupil', 'Community')),
  meal_served BOOLEAN NOT NULL,
  overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  portion_rating SMALLINT CHECK (portion_rating BETWEEN 1 AND 5),
  quality_rating SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  issue_categories TEXT[] NOT NULL DEFAULT '{}',
  comments TEXT CHECK (comments IS NULL OR char_length(comments) <= 1000),
  status TEXT NOT NULL DEFAULT 'New'
    CHECK (status IN ('New', 'Under Review', 'Resolved', 'Dismissed')),
  priority TEXT NOT NULL DEFAULT 'Low'
    CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  submission_fingerprint TEXT NOT NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_notes TEXT CHECK (review_notes IS NULL OR char_length(review_notes) <= 2000),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feeding_feedback_service_date_not_future CHECK (
    service_date <= (now() AT TIME ZONE 'Africa/Lusaka')::date
  ),
  CONSTRAINT feeding_feedback_rating_when_served CHECK (
    (meal_served AND overall_rating IS NOT NULL)
    OR
    (NOT meal_served AND overall_rating IS NULL AND portion_rating IS NULL AND quality_rating IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_feeding_feedback_school_service_date
  ON public.feeding_program_feedback (school_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_feeding_feedback_status_priority
  ON public.feeding_program_feedback (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feeding_feedback_fingerprint_created
  ON public.feeding_program_feedback (submission_fingerprint, created_at DESC);

DROP TRIGGER IF EXISTS update_feeding_program_feedback_updated_at ON public.feeding_program_feedback;
CREATE TRIGGER update_feeding_program_feedback_updated_at
  BEFORE UPDATE ON public.feeding_program_feedback
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

ALTER TABLE public.feeding_program_feedback ENABLE ROW LEVEL SECURITY;

-- No browser role can create reports directly. The server validates, rate-limits,
-- fingerprints and inserts with its service role.
REVOKE ALL ON public.feeding_program_feedback FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.feeding_program_feedback TO service_role;

-- Government users may read report evidence without seeing the anti-abuse fingerprint.
GRANT SELECT (
  id,
  reference_code,
  school_id,
  service_date,
  reporter_type,
  meal_served,
  overall_rating,
  portion_rating,
  quality_rating,
  issue_categories,
  comments,
  status,
  priority,
  reviewed_by,
  review_notes,
  reviewed_at,
  created_at,
  updated_at
) ON public.feeding_program_feedback TO authenticated;

GRANT UPDATE (
  status,
  reviewed_by,
  review_notes,
  reviewed_at,
  updated_at
) ON public.feeding_program_feedback TO authenticated;

DROP POLICY IF EXISTS "Government officers view anonymous feeding feedback" ON public.feeding_program_feedback;
CREATE POLICY "Government officers view anonymous feeding feedback"
  ON public.feeding_program_feedback FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  );

DROP POLICY IF EXISTS "Government officers review anonymous feeding feedback" ON public.feeding_program_feedback;
CREATE POLICY "Government officers review anonymous feeding feedback"
  ON public.feeding_program_feedback FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role IN ('government', 'system_admin') OR secondary_role IN ('government', 'system_admin'))
    )
  );

COMMENT ON TABLE public.feeding_program_feedback IS
  'Anonymous parent, pupil and community confirmations used as independent feeding-program evidence.';
COMMENT ON COLUMN public.feeding_program_feedback.submission_fingerprint IS
  'Server-generated one-way HMAC used only for abuse and duplicate detection; raw IP addresses are not stored.';
