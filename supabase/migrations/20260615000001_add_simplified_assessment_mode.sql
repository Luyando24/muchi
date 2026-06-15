-- Add simplified_assessment_mode column to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS simplified_assessment_mode BOOLEAN NOT NULL DEFAULT FALSE;
