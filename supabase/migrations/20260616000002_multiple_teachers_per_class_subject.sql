-- Modify class_subjects unique constraint to allow multiple teachers
ALTER TABLE public.class_subjects 
DROP CONSTRAINT IF EXISTS class_subjects_class_id_subject_id_key;

-- Add new composite unique constraint including teacher_id
ALTER TABLE public.class_subjects
ADD CONSTRAINT class_subjects_class_id_subject_id_teacher_id_key UNIQUE (class_id, subject_id, teacher_id);
