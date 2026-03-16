-- Add exam_types array to schools table
ALTER TABLE IF EXISTS public.schools
ADD COLUMN IF NOT EXISTS exam_types TEXT[] DEFAULT ARRAY['Mid Term', 'End of Term'];

-- Add exam_type column to student_grades table
ALTER TABLE IF EXISTS public.student_grades
ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'End of Term';

-- Drop the old unique constraint (requires knowing the constraint name, but we can try to drop by name convention or alter table)
-- Supabase automatically names unique constraints like `table_col1_col2_key`
DO $$
DECLARE
    con_name text;
BEGIN
    SELECT constraint_name INTO con_name
    FROM information_schema.table_constraints
    WHERE table_name = 'student_grades' AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%student_id_subject_id_term_academic_year%';

    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.student_grades DROP CONSTRAINT ' || con_name;
    END IF;
END $$;

-- Drop the one explicitly named in migration 0011 if the above misses it
ALTER TABLE IF EXISTS public.student_grades DROP CONSTRAINT IF EXISTS student_grades_student_id_subject_id_term_academic_year_key;

-- Create the new unique constraint including exam_type
ALTER TABLE IF EXISTS public.student_grades 
ADD CONSTRAINT student_grades_student_subject_term_year_exam_unique UNIQUE (student_id, subject_id, term, academic_year, exam_type);
