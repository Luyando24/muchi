-- 1. Drop existing classes_teacher_id_fkey constraint and add it back with ON DELETE SET NULL
ALTER TABLE public.classes 
DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

ALTER TABLE public.classes
ADD CONSTRAINT classes_teacher_id_fkey 
FOREIGN KEY (teacher_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- 2. Add class_teacher_name to public.classes and teacher_name to public.class_subjects
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS class_teacher_name TEXT;

ALTER TABLE public.class_subjects
ADD COLUMN IF NOT EXISTS teacher_name TEXT;

-- 3. Create or replace trigger function to snapshot teacher name before delete
CREATE OR REPLACE FUNCTION public.handle_teacher_deletion_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'teacher' THEN
    -- Snapshot class teacher name on classes they taught
    UPDATE public.classes 
    SET class_teacher_name = OLD.full_name 
    WHERE class_teacher_id = OLD.id OR teacher_id = OLD.id;

    -- Snapshot subject teacher name on class_subjects they taught
    UPDATE public.class_subjects 
    SET teacher_name = OLD.full_name 
    WHERE teacher_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger BEFORE DELETE on public.profiles
DROP TRIGGER IF EXISTS teacher_deletion_snapshot_trigger ON public.profiles;
CREATE TRIGGER teacher_deletion_snapshot_trigger
BEFORE DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_teacher_deletion_snapshot();
