-- Safely add missing configuration columns to schools table with dynamic defaults

DO $$
BEGIN
    -- Add academic_year if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'academic_year') THEN
        ALTER TABLE schools ADD COLUMN academic_year TEXT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    END IF;

    -- Add current_term if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'current_term') THEN
        ALTER TABLE schools ADD COLUMN current_term TEXT;
        -- Set dynamic default term based on current month
        UPDATE schools SET current_term = CASE 
            WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 4 THEN 'Term 1'
            WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 8 THEN 'Term 2'
            ELSE 'Term 3'
        END WHERE current_term IS NULL;
    END IF;

    -- Add exam_types if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'exam_types') THEN
        ALTER TABLE schools ADD COLUMN exam_types TEXT[] DEFAULT ARRAY['Mid Term', 'End of Term'];
    END IF;
END $$;
