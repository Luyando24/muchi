
-- Create Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Academic', 'Financial', 'Student', 'Staff', 'System'
  generated_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'Ready' CHECK (status IN ('Ready', 'Processing', 'Failed')),
  file_url TEXT, -- Optional: link to stored file
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create Policy
CREATE POLICY "School Admins manage reports"
ON reports FOR ALL USING (
  is_school_admin() AND school_id = get_my_school_id()
);
