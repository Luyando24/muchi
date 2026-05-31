-- Add test_types_enabled column to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS test_types_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Enable test types for schools that already have configured test types
UPDATE public.schools
SET test_types_enabled = TRUE
WHERE test_types IS NOT NULL AND test_types != '{}'::text[];

-- Set the default value on table definition to ['Test 1', 'Test 2', 'Test 3']
ALTER TABLE public.schools ALTER COLUMN test_types SET DEFAULT ARRAY['Test 1', 'Test 2', 'Test 3'];

-- Populate ['Test 1', 'Test 2', 'Test 3'] default for schools that currently have empty/null test types
UPDATE public.schools
SET test_types = ARRAY['Test 1', 'Test 2', 'Test 3']
WHERE test_types IS NULL OR test_types = '{}'::text[];

-- Update Taungup Secondary settings specifically
UPDATE public.schools
SET 
    test_types = ARRAY['Test 1', 'Test 2', 'Test 3'],
    test_types_enabled = TRUE
WHERE id = 'e18574e1-5152-4bb9-8122-3361bb17f09d';

-- Update student grades test_type from 'End of term test' to 'Test 3' for Taungup Secondary
UPDATE public.student_grades
SET test_type = 'Test 3'
WHERE school_id = 'e18574e1-5152-4bb9-8122-3361bb17f09d' AND test_type = 'End of term test';
