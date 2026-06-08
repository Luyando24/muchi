-- Add employment_date column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employment_date DATE;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
