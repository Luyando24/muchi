-- Migration: Add School Category and Country to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Zambia';

-- Add a comment to the table to explain the purpose of the category field
COMMENT ON COLUMN schools.category IS 'Institution category (Private, Government, Mission, etc.) - Used for MoE statistical purposes.';
