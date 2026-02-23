CREATE TABLE IF NOT EXISTS student_subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  academic_year TEXT,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, academic_year)
);

ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School staff can manage student subjects" ON student_subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND school_id = (SELECT school_id FROM profiles WHERE id = student_subjects.student_id)
      AND role IN ('school_admin', 'teacher')
    )
  );

CREATE POLICY "Students can view their own subjects" ON student_subjects
  FOR SELECT USING (auth.uid() = student_id);
