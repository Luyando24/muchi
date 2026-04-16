-- Add term and academic_year to assignments table
-- This fixes the 'column assignments_1.term does not exist' error in live-stats reports

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'term') THEN
        ALTER TABLE assignments ADD COLUMN term TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'academic_year') THEN
        ALTER TABLE assignments ADD COLUMN academic_year TEXT;
    END IF;
END $$;

-- Update existing records to default values if possible (optional)
-- We'll leave them as NULL or manually update if term/year are available in class settings.
