-- Create Student Applications Table
CREATE TABLE IF NOT EXISTS student_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  grade_level TEXT NOT NULL,
  previous_school TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE student_applications ENABLE ROW LEVEL SECURITY;

-- School admins can view applications for their school
CREATE POLICY "School Admins view applications"
ON student_applications FOR SELECT USING (
  is_school_admin() AND school_id = get_my_school_id()
);

-- School admins can update applications for their school
CREATE POLICY "School Admins manage applications"
ON student_applications FOR UPDATE USING (
  is_school_admin() AND school_id = get_my_school_id()
);

-- School admins can delete applications for their school
CREATE POLICY "School Admins delete applications"
ON student_applications FOR DELETE USING (
  is_school_admin() AND school_id = get_my_school_id()
);

-- Public can insert applications
CREATE POLICY "Public can insert applications"
ON student_applications FOR INSERT WITH CHECK (true);
