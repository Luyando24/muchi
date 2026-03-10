
-- Add term and academic_year to finance_records table
ALTER TABLE finance_records 
ADD COLUMN IF NOT EXISTS term TEXT,
ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- Update RLS policies just in case, though they usually cover all columns
-- No changes needed to RLS if it's already "FOR ALL"
