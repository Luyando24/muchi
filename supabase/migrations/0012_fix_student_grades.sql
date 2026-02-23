
-- Re-create student_grades table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  grade TEXT NOT NULL, -- A, B, C...
  percentage INTEGER NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, term, academic_year)
);

-- Enable RLS
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students view own grades" ON student_grades
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Staff manage grades" ON student_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND school_id = student_grades.school_id AND role IN ('school_admin', 'teacher')
    )
  );
