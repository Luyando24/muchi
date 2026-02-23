
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM schools LOOP
        -- Insert Grading Scales if not exists
        IF NOT EXISTS (SELECT 1 FROM grading_scales WHERE school_id = r.id) THEN
            INSERT INTO grading_scales (school_id, grade, min_percentage, max_percentage, description) VALUES
            (r.id, '1', 75, 100, 'Distinction'),
            (r.id, '2', 70, 74, 'Distinction'),
            (r.id, '3', 65, 69, 'Merit'),
            (r.id, '4', 60, 64, 'Merit'),
            (r.id, '5', 55, 59, 'Credit'),
            (r.id, '6', 50, 54, 'Credit'),
            (r.id, '7', 45, 49, 'Satisfactory'),
            (r.id, '8', 40, 44, 'Satisfactory'),
            (r.id, '9', 0, 39, 'Unsatisfactory');
        END IF;

        -- Insert Grading Weights if not exists
        IF NOT EXISTS (SELECT 1 FROM grading_weights WHERE school_id = r.id) THEN
            INSERT INTO grading_weights (school_id, assessment_type, weight_percentage) VALUES
            (r.id, 'Exam', 60),
            (r.id, 'Test', 20),
            (r.id, 'Assignment', 10),
            (r.id, 'Project', 10);
        END IF;
    END LOOP;
END $$;
