-- Add onboarding completion flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Add verification flag to schools to track approval status separately
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.has_completed_onboarding IS 'Tracks whether the school admin has finished the mandatory onboarding tutorial';
COMMENT ON COLUMN public.schools.is_verified IS 'Whether the school has been verified/approved by a system administrator';
