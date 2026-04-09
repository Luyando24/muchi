-- Add headteacher details to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS headteacher_name TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS headteacher_title TEXT DEFAULT 'Headteacher';
