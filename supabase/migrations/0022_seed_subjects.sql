-- Seed Subjects for Arakan Boys
-- This migration seeds default subjects if they don't exist.

DO $$
DECLARE
    v_school_id UUID;
BEGIN
    -- 1. Get or Create School "Arakan Boys"
    SELECT id INTO v_school_id FROM schools WHERE name = 'Arakan Boys' LIMIT 1;
    
    IF v_school_id IS NULL THEN
        INSERT INTO schools (name, slug, plan)
        VALUES ('Arakan Boys', 'arakan-boys', 'Standard')
        RETURNING id INTO v_school_id;
        
        RAISE NOTICE 'Created school Arakan Boys with ID %', v_school_id;
    ELSE
        RAISE NOTICE 'Found existing school Arakan Boys with ID %', v_school_id;
    END IF;

    -- 2. Insert Subjects
    -- Only insert if no subjects exist for this school to prevent duplicates
    IF NOT EXISTS (SELECT 1 FROM subjects WHERE school_id = v_school_id) THEN
        INSERT INTO subjects (school_id, name, department, code) VALUES
        (v_school_id, 'Mathematics', 'Mathematics', 'MATH'),
        (v_school_id, 'English Language', 'Languages', 'ENG'),
        (v_school_id, 'Integrated Science', 'Science', 'SCI'),
        (v_school_id, 'Physics', 'Science', 'PHY'),
        (v_school_id, 'Chemistry', 'Science', 'CHEM'),
        (v_school_id, 'Biology', 'Science', 'BIO'),
        (v_school_id, 'Geography', 'Humanities', 'GEO'),
        (v_school_id, 'History', 'Humanities', 'HIS'),
        (v_school_id, 'Computer Studies', 'ICT', 'COMP'),
        (v_school_id, 'Physical Education', 'Sports', 'PE');
        
        RAISE NOTICE 'Seeded 10 subjects for Arakan Boys';
    ELSE
        RAISE NOTICE 'Subjects already exist for Arakan Boys, skipping seed.';
    END IF;
END $$;
