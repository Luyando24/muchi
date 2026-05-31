-- Add compulsory_subjects array to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS compulsory_subjects TEXT[] DEFAULT ARRAY['English'];
