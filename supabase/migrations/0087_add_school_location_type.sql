-- Migration: Add location_type column to schools table
-- This shifts the source of truth for teacher location (Urban/Rural) from
-- the individual teacher's profile to the school they belong to.

-- Step 1: Add the column (defaults to 'Urban' for new rows)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS location_type TEXT NOT NULL DEFAULT 'Urban'
    CHECK (location_type IN ('Urban', 'Rural'));

COMMENT ON COLUMN public.schools.location_type IS
  'Indicates whether the school is in an Urban or Rural area. '
  'Used by the government to track teacher deployment and rural shortages.';

-- Step 2: Backfill all existing schools to 'Urban'
UPDATE public.schools
  SET location_type = 'Urban';
