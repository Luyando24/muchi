-- Migration: Disk I/O & Buffer Churn Optimizations
-- 1. Targeted partial covering index for student_grades (school_id, student_id, academic_year)
--    with INCLUDE (term, exam_type) for status IN ('Submitted', 'Published').
-- 2. Optimized get_school_grade_combos RPC: filters enrollments first to requested classes,
--    joins active grades with scoped work_mem, eliminating temporary-file hash/sort disk spills.
-- 3. Avoid unchanged cache upserts on report_card_cache:
--    - upsert_report_card_cache RPC with ON CONFLICT ... WHERE student_count or data differs
--    - BEFORE UPDATE trigger on report_card_cache suppressing update when payload is identical
-- 4. Avoid unchanged grade updates on student_grades:
--    - BEFORE UPDATE trigger suppressing update when score/percentage/grade/status are identical

-- ============================================================================
-- 1. Targeted partial index for submitted/published grades lookup
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_student_grades_school_student_year_active
ON public.student_grades (school_id, student_id, academic_year)
INCLUDE (term, exam_type)
WHERE status IN ('Submitted', 'Published');

-- ============================================================================
-- 2. Optimized get_school_grade_combos RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_school_grade_combos(
  p_school_id uuid,
  p_class_ids uuid[]
)
RETURNS TABLE (
  class_id      uuid,
  term          text,
  exam_type     text,
  academic_year text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET work_mem = '16MB'
AS $$
BEGIN
  -- Early exit if no school or class IDs provided
  IF p_school_id IS NULL OR p_class_ids IS NULL OR cardinality(p_class_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH target_enrollments AS (
    SELECT DISTINCT
      e.class_id,
      e.student_id,
      e.academic_year
    FROM public.enrollments e
    WHERE e.school_id = p_school_id
      AND e.class_id = ANY(p_class_ids)
  )
  SELECT DISTINCT
    te.class_id,
    sg.term,
    sg.exam_type,
    sg.academic_year
  FROM target_enrollments te
  JOIN public.student_grades sg
    ON sg.school_id = p_school_id
    AND sg.student_id = te.student_id
    AND sg.academic_year = te.academic_year
    AND sg.status IN ('Submitted', 'Published');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_grade_combos(uuid, uuid[]) TO service_role;

-- ============================================================================
-- 3. Avoid unchanged report_card_cache updates
-- ============================================================================

-- Specialized RPC: updates only when student_count or cached JSON payload actually differs
CREATE OR REPLACE FUNCTION public.upsert_report_card_cache(
  p_school_id     uuid,
  p_class_id      uuid,
  p_term          text,
  p_exam_type     text,
  p_academic_year text,
  p_student_count integer,
  p_data          jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.report_card_cache (
    school_id,
    class_id,
    term,
    exam_type,
    academic_year,
    student_count,
    data,
    cached_at
  )
  VALUES (
    p_school_id,
    p_class_id,
    p_term,
    p_exam_type,
    p_academic_year,
    p_student_count,
    p_data,
    now()
  )
  ON CONFLICT (school_id, class_id, term, exam_type, academic_year)
  DO UPDATE SET
    student_count = EXCLUDED.student_count,
    data          = EXCLUDED.data,
    cached_at     = now()
  WHERE report_card_cache.student_count IS DISTINCT FROM EXCLUDED.student_count
     OR report_card_cache.data IS DISTINCT FROM EXCLUDED.data;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_report_card_cache(uuid, uuid, text, text, text, integer, jsonb) TO service_role;

-- Safety trigger: suppresses updates from raw PostgREST upsert when data has not changed
CREATE OR REPLACE FUNCTION public.trg_report_card_cache_suppress_unchanged()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If student_count and data haven't changed, suppress row update completely (0 writes, 0 dirty blocks)
  -- cached_at timestamp is deliberately NOT compared so timestamp updates don't force rewrites.
  IF OLD.student_count IS NOT DISTINCT FROM NEW.student_count
     AND OLD.data IS NOT DISTINCT FROM NEW.data THEN
    RETURN NULL;
  END IF;

  NEW.cached_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suppress_unchanged_report_card_cache ON public.report_card_cache;
CREATE TRIGGER trg_suppress_unchanged_report_card_cache
BEFORE UPDATE ON public.report_card_cache
FOR EACH ROW
EXECUTE FUNCTION public.trg_report_card_cache_suppress_unchanged();

-- ============================================================================
-- 4. Avoid unchanged student_grades updates
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_student_grades_suppress_unchanged()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Suppress update if percentage, letter grade, comments, status, and raw scores are identical
  IF OLD.percentage IS NOT DISTINCT FROM NEW.percentage
     AND OLD.grade IS NOT DISTINCT FROM NEW.grade
     AND OLD.comments IS NOT DISTINCT FROM NEW.comments
     AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.score IS NOT DISTINCT FROM NEW.score
     AND OLD.total_score IS NOT DISTINCT FROM NEW.total_score THEN
    RETURN NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suppress_unchanged_student_grades ON public.student_grades;
CREATE TRIGGER trg_suppress_unchanged_student_grades
BEFORE UPDATE ON public.student_grades
FOR EACH ROW
EXECUTE FUNCTION public.trg_student_grades_suppress_unchanged();

