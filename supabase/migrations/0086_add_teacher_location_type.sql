-- Add location_type to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_type TEXT CHECK (location_type IN ('Rural', 'Urban'));

-- Add location_type to schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'Urban' CHECK (location_type IN ('Rural', 'Urban'));

-- Backfill some schools to be Rural (e.g. first two schools)
UPDATE public.schools SET location_type = 'Rural' WHERE id IN (SELECT id FROM public.schools ORDER BY name ASC LIMIT 2);

-- Backfill teacher profiles location types based on their school's location type
UPDATE public.profiles p
SET location_type = s.location_type
FROM public.schools s
WHERE p.school_id = s.id AND p.role = 'teacher' AND p.location_type IS NULL;
