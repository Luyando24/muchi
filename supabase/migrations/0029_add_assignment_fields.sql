-- Add category and assignment_number to assignments table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'category') THEN
        ALTER TABLE assignments ADD COLUMN category TEXT DEFAULT 'Homework';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'assignment_number') THEN
        ALTER TABLE assignments ADD COLUMN assignment_number INTEGER DEFAULT 1;
    END IF;
END $$;
