-- Add coat of arms logo to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS coat_of_arms_url TEXT;
