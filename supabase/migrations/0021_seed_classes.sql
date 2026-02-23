-- Seed Classes for Arakan Boys
-- This migration seeds default classes if they don't exist.

DO $$
DECLARE
    v_school_id UUID;
    v_academic_year TEXT := '2024';
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

    -- 2. Insert Classes (Grade 8-12)
    -- Only insert if no classes exist for this school to prevent duplicates
    IF NOT EXISTS (SELECT 1 FROM classes WHERE school_id = v_school_id) THEN
        INSERT INTO classes (school_id, name, level, room, capacity, academic_year) VALUES
        (v_school_id, 'Grade 8A', 'Grade 8', 'Room 801', 40, v_academic_year),
        (v_school_id, 'Grade 8B', 'Grade 8', 'Room 802', 40, v_academic_year),
        (v_school_id, 'Grade 9A', 'Grade 9', 'Room 901', 40, v_academic_year),
        (v_school_id, 'Grade 9B', 'Grade 9', 'Room 902', 40, v_academic_year),
        (v_school_id, 'Grade 10A', 'Grade 10', 'Room 1001', 40, v_academic_year),
        (v_school_id, 'Grade 10B', 'Grade 10', 'Room 1002', 40, v_academic_year),
        (v_school_id, 'Grade 11A', 'Grade 11', 'Room 1101', 40, v_academic_year),
        (v_school_id, 'Grade 11B', 'Grade 11', 'Room 1102', 40, v_academic_year),
        (v_school_id, 'Grade 12A', 'Grade 12', 'Room 1201', 40, v_academic_year),
        (v_school_id, 'Grade 12B', 'Grade 12', 'Room 1202', 40, v_academic_year);
        
        RAISE NOTICE 'Seeded 10 classes for Arakan Boys (Grade 8-12)';
    ELSE
        RAISE NOTICE 'Classes already exist for Arakan Boys, skipping seed.';
    END IF;
END $$;
