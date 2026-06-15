-- Set default value to true on table definitions
ALTER TABLE public.schools ALTER COLUMN test_types_enabled SET DEFAULT TRUE;
ALTER TABLE public.schools ALTER COLUMN simplified_assessment_mode SET DEFAULT TRUE;

-- Update all existing schools to enable these options by default
UPDATE public.schools
SET test_types_enabled = TRUE, simplified_assessment_mode = TRUE;
