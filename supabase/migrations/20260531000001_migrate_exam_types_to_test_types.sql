-- Add test_types column to schools table if not exists
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS test_types TEXT[] DEFAULT '{}'::text[];

-- Add test_type column to student_grades table if not exists
ALTER TABLE public.student_grades ADD COLUMN IF NOT EXISTS test_type TEXT NOT NULL DEFAULT '';

-- Drop the old unique constraint/index if it exists
ALTER TABLE public.student_grades DROP CONSTRAINT IF EXISTS student_grades_student_subject_term_year_exam_unique;
DROP INDEX IF EXISTS public.student_grades_student_subject_term_year_exam_unique;

-- Migrate existing grades from custom exam_types to test_types
UPDATE public.student_grades
SET
    test_type = exam_type,
    exam_type = CASE 
        WHEN LOWER(exam_type) LIKE '%mid%' THEN 'Mid Term'
        ELSE 'End of Term'
    END
WHERE exam_type NOT IN ('Mid Term', 'End of Term');

-- Migrate school-level custom exam types to test_types
DO $$
DECLARE
    school_rec RECORD;
    val TEXT;
    new_tests TEXT[];
BEGIN
    FOR school_rec IN SELECT id, exam_types, test_types FROM public.schools LOOP
        new_tests := school_rec.test_types;
        IF new_tests IS NULL THEN
            new_tests := '{}'::text[];
        END IF;
        
        -- Check if there are custom exam types
        IF school_rec.exam_types IS NOT NULL THEN
            FOREACH val IN ARRAY school_rec.exam_types LOOP
                IF val NOT IN ('Mid Term', 'End of Term') AND NOT (val = ANY(new_tests)) THEN
                    new_tests := array_append(new_tests, val);
                END IF;
            END LOOP;
        END IF;
        
        -- Update the school settings to enforce only Mid Term and End of Term as exam_types, and move custom to test_types
        UPDATE public.schools
        SET 
            exam_types = ARRAY['Mid Term', 'End of Term'],
            test_types = new_tests
        WHERE id = school_rec.id;
    END LOOP;
END $$;

-- Create the new unique constraint including test_type
ALTER TABLE public.student_grades 
ADD CONSTRAINT student_grades_student_subject_term_year_exam_unique UNIQUE (student_id, subject_id, term, academic_year, exam_type, test_type);
