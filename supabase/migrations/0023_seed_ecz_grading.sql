-- Seed ECZ Grading System for Arakan Boys Secondary
-- ECZ Grading Scale:
-- One (1) - Distinction: 75% - 100%
-- Two (2) - Distinction: 70% - 74%
-- Three (3) - Merit: 65% - 69%
-- Four (4) - Merit: 60% - 64%
-- Five (5) - Credit: 55% - 59%
-- Six (6) - Credit: 50% - 54%
-- Seven (7) - Satisfactory: 45% - 49%
-- Eight (8) - Satisfactory: 40% - 44%
-- Nine (9) - Unsatisfactory: 0% - 39%
-- Note: Secondary schools do not use GPA grading, so gpa_point is set to 0.

DO $$
DECLARE
    v_school_id UUID;
BEGIN
    -- 1. Get School "Arakan Boys Secondary"
    SELECT id INTO v_school_id FROM schools WHERE name = 'Arakan Boys Secondary' LIMIT 1;
    
    IF v_school_id IS NULL THEN
        RAISE NOTICE 'School Arakan Boys Secondary not found. Skipping grading seed.';
        RETURN;
    END IF;

    -- 2. Insert Grading Scales
    -- Only insert if no scales exist for this school
    IF NOT EXISTS (SELECT 1 FROM grading_scales WHERE school_id = v_school_id) THEN
        INSERT INTO grading_scales (school_id, grade, min_percentage, max_percentage, gpa_point, description) VALUES
        (v_school_id, '1', 75, 100, 0, 'Distinction'),
        (v_school_id, '2', 70, 74, 0, 'Distinction'),
        (v_school_id, '3', 65, 69, 0, 'Merit'),
        (v_school_id, '4', 60, 64, 0, 'Merit'),
        (v_school_id, '5', 55, 59, 0, 'Credit'),
        (v_school_id, '6', 50, 54, 0, 'Credit'),
        (v_school_id, '7', 45, 49, 0, 'Satisfactory'),
        (v_school_id, '8', 40, 44, 0, 'Satisfactory'),
        (v_school_id, '9', 0, 39, 0, 'Unsatisfactory');
        
        RAISE NOTICE 'Seeded ECZ grading scale for Arakan Boys Secondary';
    ELSE
        RAISE NOTICE 'Grading scales already exist for Arakan Boys Secondary, skipping seed.';
    END IF;

    -- 3. Insert Default Assessment Weights (Example weights)
    IF NOT EXISTS (SELECT 1 FROM grading_weights WHERE school_id = v_school_id) THEN
        INSERT INTO grading_weights (school_id, assessment_type, weight_percentage) VALUES
        (v_school_id, 'Exam', 60),
        (v_school_id, 'Test', 20),
        (v_school_id, 'Assignment', 10),
        (v_school_id, 'Project', 10);
        
        RAISE NOTICE 'Seeded default assessment weights for Arakan Boys Secondary';
    ELSE
        RAISE NOTICE 'Grading weights already exist for Arakan Boys Secondary, skipping seed.';
    END IF;
END $$;
