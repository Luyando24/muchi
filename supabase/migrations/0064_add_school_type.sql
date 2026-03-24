
-- Add school_type column to schools table
ALTER TABLE IF EXISTS public.schools 
ADD COLUMN IF NOT EXISTS school_type TEXT DEFAULT 'Secondary' CHECK (school_type IN ('Secondary', 'Basic'));
