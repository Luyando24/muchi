-- Migration: fast combo discovery for report card cache status
-- Replaces JS-side paginated scan of up to 30,000 student_grades rows with a
-- single GROUP BY aggregation returning only the distinct combos (~N rows).

CREATE OR REPLACE FUNCTION get_school_grade_combos(p_school_id uuid, p_class_ids uuid[])
RETURNS TABLE (
  class_id   uuid,
  term       text,
  exam_type  text,
  academic_year text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT
    e.class_id,
    sg.term,
    sg.exam_type,
    sg.academic_year::text
  FROM student_grades sg
  JOIN enrollments e
    ON e.student_id = sg.student_id
    AND e.academic_year::text = sg.academic_year::text
    AND e.class_id = ANY(p_class_ids)
  WHERE sg.school_id = p_school_id
    AND sg.status IN ('Submitted', 'Published');
$$;

GRANT EXECUTE ON FUNCTION get_school_grade_combos(uuid, uuid[]) TO service_role;
