-- Add signature_url and seal_url to schools table
ALTER TABLE IF EXISTS public.schools
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS seal_url TEXT;
