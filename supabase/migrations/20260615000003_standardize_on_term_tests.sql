-- Resolve duplicate test grades: keep the one with the highest percentage or the End of Term record, and delete the duplicates.
WITH duplicate_groups AS (
  SELECT id,
         ROW_NUMBER() OVER(
           PARTITION BY student_id, subject_id, term, academic_year, test_type
           ORDER BY COALESCE(percentage, -1) DESC,
                    CASE WHEN exam_type = 'End of Term' THEN 1 ELSE 2 END,
                    updated_at DESC
         ) as rn
  FROM public.student_grades
  WHERE test_type IS NOT NULL AND test_type != ''
)
DELETE FROM public.student_grades
WHERE id IN (
  SELECT id FROM duplicate_groups WHERE rn > 1
);

-- Update all test grade records to belong to 'Term' exam type
UPDATE public.student_grades
SET exam_type = 'Term'
WHERE test_type IS NOT NULL AND test_type != '';

-- Enforce simplified assessment mode for all schools by default
ALTER TABLE public.schools ALTER COLUMN simplified_assessment_mode SET DEFAULT TRUE;
UPDATE public.schools SET simplified_assessment_mode = TRUE;
