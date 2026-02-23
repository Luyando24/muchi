
-- Create class_subjects table
CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Optional: Subject teacher for this class
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);

-- Enable RLS
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "School staff can view class subjects" ON class_subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_subjects.class_id
      AND classes.school_id IN (
        SELECT school_id FROM profiles
        WHERE id = auth.uid() AND role IN ('school_admin', 'teacher', 'student')
      )
    )
  );

CREATE POLICY "School admins can manage class subjects" ON class_subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_subjects.class_id
      AND classes.school_id IN (
        SELECT school_id FROM profiles
        WHERE id = auth.uid() AND role = 'school_admin'
      )
    )
  );
